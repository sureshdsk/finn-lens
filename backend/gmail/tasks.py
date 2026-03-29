"""arq task functions for the email sync pipeline.

Pipeline: fetch → classify → parse → materialize → classify_transactions
Each task enqueues the next on success.
"""
from __future__ import annotations

import logging

from asgiref.sync import sync_to_async
from django.utils import timezone as dj_timezone

logger = logging.getLogger(__name__)

PIPELINE_STEPS = ["fetch", "classify", "parse", "materialize", "classify_transactions", "detect_subscriptions"]


async def _get_step(sync_job, step_name):
    return await sync_job.steps.aget(step_name=step_name)


async def _mark_running(step):
    step.status = "running"
    step.started_at = dj_timezone.now()
    await step.asave(update_fields=["status", "started_at"])


async def _mark_completed(step):
    step.status = "completed"
    step.completed_at = dj_timezone.now()
    await step.asave(update_fields=["status", "completed_at"])


async def _mark_failed(step, error_message: str):
    step.status = "failed"
    step.error_message = error_message
    step.completed_at = dj_timezone.now()
    await step.asave(update_fields=["status", "error_message", "completed_at"])


async def _fail_job(sync_job, error_message: str):
    sync_job.status = "failed"
    sync_job.error_message = error_message
    sync_job.completed_at = dj_timezone.now()
    await sync_job.asave(update_fields=["status", "error_message", "completed_at"])


def _next_step_name(current_step: str) -> str | None:
    idx = PIPELINE_STEPS.index(current_step)
    if idx + 1 < len(PIPELINE_STEPS):
        return PIPELINE_STEPS[idx + 1]
    return None


TASK_MAP = {
    "fetch": "task_fetch",
    "classify": "task_classify",
    "parse": "task_parse",
    "materialize": "task_materialize",
    "classify_transactions": "task_classify_transactions",
    "detect_subscriptions": "task_detect_subscriptions",
}


async def _enqueue_next(ctx, current_step: str, sync_job_id: int):
    next_step = _next_step_name(current_step)
    if next_step:
        await ctx["redis"].enqueue_job(TASK_MAP[next_step], sync_job_id)
    else:
        # Final step completed — mark job done
        from .models import SyncJob
        sync_job = await SyncJob.objects.select_related("gmail_account").aget(pk=sync_job_id)
        sync_job.status = "completed"
        sync_job.completed_at = dj_timezone.now()
        await sync_job.asave(update_fields=["status", "completed_at"])

        account = sync_job.gmail_account
        account.last_sync_at = dj_timezone.now()
        await account.asave(update_fields=["last_sync_at"])


async def _mark_reauth(account, reason: str):
    account.needs_reauth = True
    account.reauth_reason = reason
    account.is_active = False
    await account.asave(update_fields=["needs_reauth", "reauth_reason", "is_active"])


async def _save_step_progress(step, fields=None):
    fields = fields or ["processed_items", "error_count"]
    await step.asave(update_fields=fields)


def _is_reauth_error(exc: Exception) -> bool:
    err_str = str(exc).lower()
    return any(token in err_str for token in (
        "invalid_grant",
        "token",
        "revoked",
        "insufficient authentication scopes",
        "insufficient permission",
        "insufficientpermissions",
        "access denied",
    ))


def _reauth_reason(exc: Exception) -> str:
    err_str = str(exc).lower()
    if "insufficient authentication scopes" in err_str or "insufficient permission" in err_str:
        return "Gmail access is missing required read permissions. Please reconnect your Gmail account."
    return "Google authorization expired. Please reconnect your Gmail account."


# ── Task: Fetch ──────────────────────────────────────────────────────────────


async def task_fetch(ctx, sync_job_id: int):
    """Fetch emails from Gmail API. Handles OAuth token expiry."""
    from .models import SyncJob
    from .services import GmailFetcher, get_gmail_service

    sync_job = await SyncJob.objects.select_related("gmail_account").aget(pk=sync_job_id)
    account = sync_job.gmail_account
    step = await _get_step(sync_job, "fetch")

    sync_job.status = "running"
    await sync_job.asave(update_fields=["status"])
    await _mark_running(step)

    try:
        # Test OAuth before starting — catch expiry early
        try:
            await sync_to_async(get_gmail_service)(account)
        except Exception as e:
            if _is_reauth_error(e):
                reason = _reauth_reason(e)
                await _mark_reauth(account, reason)
                await _mark_failed(step, f"OAuth error: {e}")
                await _fail_job(sync_job, f"OAuth error: {e}")
                return
            raise

        # GmailFetcher uses sync Gmail API + ORM writes internally
        fetcher = GmailFetcher()
        if not account.last_history_id:
            await sync_to_async(fetcher.fetch_initial)(account, sync_job, sync_job.sync_months)
        else:
            await sync_to_async(fetcher.fetch_incremental)(account, sync_job)

        # Refresh from DB since fetcher updated sync_job synchronously
        await sync_job.arefresh_from_db()
        step.total_items = sync_job.total_messages
        step.processed_items = sync_job.processed_messages
        await step.asave(update_fields=["total_items", "processed_items"])
        await _mark_completed(step)
        await _enqueue_next(ctx, "fetch", sync_job_id)

    except Exception as e:
        from google.auth.exceptions import RefreshError
        from googleapiclient.errors import HttpError

        if isinstance(e, RefreshError):
            await _mark_reauth(account, _reauth_reason(e))
        elif isinstance(e, HttpError) and e.resp.status in (401, 403) and _is_reauth_error(e):
            await _mark_reauth(account, _reauth_reason(e))

        logger.exception(f"task_fetch failed for sync_job {sync_job_id}")
        await _mark_failed(step, str(e))
        await _fail_job(sync_job, str(e))


# ── Task: Classify ───────────────────────────────────────────────────────────


async def task_classify(ctx, sync_job_id: int):
    """Classify unprocessed emails by sender rules."""
    from .models import SyncJob, EmailMessage
    from .parsers import classify_sender

    sync_job = await SyncJob.objects.select_related("gmail_account").aget(pk=sync_job_id)
    account = sync_job.gmail_account
    step = await _get_step(sync_job, "classify")
    await _mark_running(step)

    try:
        rules = [r async for r in account.sender_rules.filter(is_enabled=True)]
        unprocessed = EmailMessage.objects.filter(
            gmail_account=account, is_processed=False
        )
        total = await unprocessed.acount()
        step.total_items = total
        await step.asave(update_fields=["total_items"])

        i = 0
        async for msg in unprocessed:
            try:
                has_attachment = await msg.attachments.aexists()
                source_type = classify_sender(
                    msg.sender, rules,
                    subject=msg.subject,
                    has_attachment=has_attachment,
                )
                msg.source_type = source_type.value
                await msg.asave(update_fields=["source_type"])
            except Exception as exc:
                logger.warning(f"classify failed for msg {msg.pk}: {exc}")
                step.error_count += 1

            i += 1
            step.processed_items = i
            if i % 50 == 0 or i == total:
                await _save_step_progress(step)

        await _save_step_progress(step)
        await _mark_completed(step)
        await _enqueue_next(ctx, "classify", sync_job_id)

    except Exception as e:
        logger.exception(f"task_classify failed for sync_job {sync_job_id}")
        await _mark_failed(step, str(e))
        await _fail_job(sync_job, str(e))


# ── Task: Parse ──────────────────────────────────────────────────────────────


async def task_parse(ctx, sync_job_id: int):
    """Parse each email individually. Failures are counted but don't stop the pipeline."""
    from .models import SyncJob, EmailMessage, ExtractedFinancialData
    from .parsers import parse_email
    from .services import GmailSyncService

    sync_job = await SyncJob.objects.select_related("gmail_account").aget(pk=sync_job_id)
    account = sync_job.gmail_account
    step = await _get_step(sync_job, "parse")
    await _mark_running(step)

    try:
        # Set up statement passwords (sync ORM inside, wrap)
        await sync_to_async(GmailSyncService._setup_cc_passwords)(account.user_id)
        await sync_to_async(GmailSyncService._setup_bank_statement_passwords)(account.user_id)

        unprocessed = EmailMessage.objects.filter(
            gmail_account=account, is_processed=False
        )
        total = await unprocessed.acount()
        step.total_items = total
        await step.asave(update_fields=["total_items"])

        extracted_count = 0
        i = 0
        async for msg in unprocessed:
            try:
                pdf_attachments = [
                    bytes(att.pdf_bytes)
                    async for att in msg.attachments.filter(pdf_bytes__isnull=False)
                ]
                # parse_email is CPU-bound (regex, PDF parsing) — run in thread
                results = await sync_to_async(parse_email)(
                    msg.sender, msg.subject, msg.raw_html or msg.snippet,
                    attachments=pdf_attachments or None,
                )
                for result in results:
                    await ExtractedFinancialData.objects.acreate(
                        email=msg,
                        data_type=result.data_type.value,
                        data_json=result.to_json(),
                        confidence=result.confidence,
                    )
                    extracted_count += 1
                msg.is_processed = True
                await msg.asave(update_fields=["is_processed"])
            except Exception as exc:
                logger.warning(f"parse failed for msg {msg.pk}: {exc}")
                step.error_count += 1

            i += 1
            step.processed_items = i
            if i % 20 == 0 or i == total:
                await _save_step_progress(step)

        await _save_step_progress(step)
        sync_job.extracted_count = extracted_count
        await sync_job.asave(update_fields=["extracted_count"])
        await _mark_completed(step)
        await _enqueue_next(ctx, "parse", sync_job_id)

    except Exception as e:
        logger.exception(f"task_parse failed for sync_job {sync_job_id}")
        await _mark_failed(step, str(e))
        await _fail_job(sync_job, str(e))


# ── Task: Materialize ────────────────────────────────────────────────────────


async def task_materialize(ctx, sync_job_id: int):
    """Run CC and bank statement materializers."""
    from .models import SyncJob

    sync_job = await SyncJob.objects.select_related("gmail_account").aget(pk=sync_job_id)
    step = await _get_step(sync_job, "materialize")
    await _mark_running(step)

    try:
        user_id = sync_job.gmail_account.user_id

        # CC materialization (heavy sync ORM work — run in thread)
        try:
            from banking.cc_services import CCMaterializer
            materializer = CCMaterializer()
            result = await sync_to_async(materializer.materialize)(user_id)
            logger.info(f"CC materialize: {result}")
            step.total_items += result.get("transactions", 0) + result.get("bills", 0)
        except Exception as e:
            logger.warning(f"CC materialize failed: {e}")
            step.error_count += 1
            step.error_message = f"CC: {e}"

        # Bank statement materialization
        try:
            from banking.bank_statement_services import BankStatementMaterializer
            materializer = BankStatementMaterializer()
            result = await sync_to_async(materializer.materialize)(user_id)
            logger.info(f"Bank statement materialize: {result}")
            step.total_items += result.get("transactions", 0)
        except Exception as e:
            logger.warning(f"Bank statement materialize failed: {e}")
            step.error_count += 1
            step.error_message += f" Bank: {e}"

        step.processed_items = step.total_items
        await step.asave(update_fields=["total_items", "processed_items", "error_count", "error_message"])

        if step.error_count == 0 or step.total_items > 0:
            await _mark_completed(step)
        else:
            await _mark_failed(step, step.error_message)
            await _fail_job(sync_job, step.error_message)
            return

        await _enqueue_next(ctx, "materialize", sync_job_id)

    except Exception as e:
        logger.exception(f"task_materialize failed for sync_job {sync_job_id}")
        await _mark_failed(step, str(e))
        await _fail_job(sync_job, str(e))


# ── Task: Classify Transactions ──────────────────────────────────────────────


async def task_classify_transactions(ctx, sync_job_id: int):
    """Run CCClassifier on materialized credit card transactions."""
    from .models import SyncJob

    sync_job = await SyncJob.objects.select_related("gmail_account").aget(pk=sync_job_id)
    step = await _get_step(sync_job, "classify_transactions")
    await _mark_running(step)

    try:
        user_id = sync_job.gmail_account.user_id

        try:
            from banking.cc_services import CCClassifier
            from banking.models import CreditCard

            cards = [c async for c in CreditCard.objects.filter(family__owner_id=user_id)]
            step.total_items = len(cards)
            await step.asave(update_fields=["total_items"])

            classifier = CCClassifier()
            for i, card in enumerate(cards):
                try:
                    # classify is sync (ML inference + ORM) — run in thread
                    await sync_to_async(classifier.classify)(card.pk)
                except Exception as exc:
                    logger.warning(f"CC classify failed for card {card.pk}: {exc}")
                    step.error_count += 1
                step.processed_items = i + 1
                await _save_step_progress(step)

        except Exception as e:
            logger.warning(f"CC classification failed: {e}")
            step.error_count += 1
            step.error_message = str(e)
            await step.asave(update_fields=["error_count", "error_message"])

        await _mark_completed(step)
        await _enqueue_next(ctx, "classify_transactions", sync_job_id)

    except Exception as e:
        logger.exception(f"task_classify_transactions failed for sync_job {sync_job_id}")
        await _mark_failed(step, str(e))
        await _fail_job(sync_job, str(e))


# ── Task: Detect Subscriptions ───────────────────────────────────────────────


async def task_detect_subscriptions(ctx, sync_job_id: int):
    """Detect recurring subscriptions from transaction history + email data."""
    from .models import SyncJob

    sync_job = await SyncJob.objects.select_related("gmail_account").aget(pk=sync_job_id)
    step = await _get_step(sync_job, "detect_subscriptions")
    await _mark_running(step)

    try:
        user_id = sync_job.gmail_account.user_id

        try:
            from banking.models import Family
            from banking.sub_services import materialize_subscriptions

            family = await sync_to_async(Family.objects.get)(owner_id=user_id)
            result = await sync_to_async(materialize_subscriptions)(family)
            logger.info(f"Subscription detection: {result}")
            step.total_items = result.get("detected", 0)
            step.processed_items = result.get("created", 0) + result.get("payments_linked", 0)
        except Family.DoesNotExist:
            logger.info(f"No family found for user {user_id}, skipping subscription detection")
        except Exception as e:
            logger.warning(f"Subscription detection failed: {e}")
            step.error_count += 1
            step.error_message = str(e)

        await step.asave(update_fields=["total_items", "processed_items", "error_count", "error_message"])
        await _mark_completed(step)
        # Final step — mark job completed
        await _enqueue_next(ctx, "detect_subscriptions", sync_job_id)

    except Exception as e:
        logger.exception(f"task_detect_subscriptions failed for sync_job {sync_job_id}")
        await _mark_failed(step, str(e))
        await _fail_job(sync_job, str(e))
