from django_bolt import ViewSet, Request, IsAuthenticated, JWTAuthentication
from django_bolt.exceptions import NotFound, BadRequest
from asgiref.sync import sync_to_async

from .api import api
from .models import GmailAccount, SyncJob, PipelineStep, EmailMessage, EmailSenderRule, ExtractedFinancialData
from .serializers import (
    GmailStatusResponse,
    SyncJobResponse,
    SyncTriggerRequest,
    SyncTriggerResponse,
    PipelineStepSchema,
    EmailMessageSchema,
    EmailMessageListSchema,
    EmailDetailSchema,
    SenderRuleSchema,
    CreateSenderRuleRequest,
    UpdateSenderRuleRequest,
    ExtractedDataSchema,
    MFHoldingSchema,
    InvestmentSummarySchema,
)

_auth = [JWTAuthentication()]
_guards = [IsAuthenticated]


async def _run_sync(fn, *args):
    return await sync_to_async(fn)(*args)


async def _get_gmail_account(user_id: int, *, include_inactive: bool = False) -> GmailAccount:
    try:
        qs = GmailAccount.objects.filter(user_id=user_id)
        if not include_inactive:
            qs = qs.filter(is_active=True)
        return await qs.aget()
    except GmailAccount.DoesNotExist:
        raise NotFound(detail="No Gmail account connected")


@api.viewset("/status")
class GmailStatusViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(self, request: Request):
        """GET /api/gmail/status/ — connection status + last sync time"""
        user_id = int(request.context["user_id"])
        try:
            account = await _get_gmail_account(user_id, include_inactive=True)
            return GmailStatusResponse(
                connected=True,
                email=account.email,
                last_sync_at=account.last_sync_at.isoformat() if account.last_sync_at else None,
                is_active=account.is_active,
                needs_reauth=account.needs_reauth,
                reauth_reason=account.reauth_reason,
            )
        except GmailAccount.DoesNotExist:
            return GmailStatusResponse(connected=False)


@api.viewset("/disconnect")
class GmailDisconnectViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def create(self, request: Request):
        """POST /api/gmail/disconnect/ — revoke tokens and delete"""
        user_id = int(request.context["user_id"])
        account = await _get_gmail_account(user_id, include_inactive=True)

        # Try to revoke token at Google
        try:
            from gmail.encryption import decrypt_token
            import httpx

            refresh_token = decrypt_token(account.refresh_token)
            async with httpx.AsyncClient() as client:
                await client.post(
                    "https://oauth2.googleapis.com/revoke",
                    params={"token": refresh_token},
                )
        except Exception:
            pass  # Best effort revocation

        # Delete all data
        await sync_to_async(account.delete)()
        return {"disconnected": True}


@api.viewset("/sync")
class SyncViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def create(self, request: Request, data: SyncTriggerRequest):
        """POST /api/gmail/sync/ — trigger manual sync via arq pipeline"""
        user_id = int(request.context["user_id"])
        account = await _get_gmail_account(user_id, include_inactive=True)

        if account.needs_reauth:
            raise BadRequest(detail=account.reauth_reason or "Gmail authorization expired. Please reconnect your account.")
        if not account.is_active:
            raise BadRequest(detail="Gmail account is inactive. Please reconnect your account.")

        # Expire stale jobs stuck in pending/running for >10 minutes
        from django.utils import timezone as dj_timezone
        from datetime import timedelta
        stale_cutoff = dj_timezone.now() - timedelta(minutes=10)
        await SyncJob.objects.filter(
            gmail_account=account,
            status__in=["pending", "running"],
            started_at__lt=stale_cutoff,
        ).aupdate(status="failed", error_message="Timed out", completed_at=dj_timezone.now())

        # Check no sync already running
        running = await SyncJob.objects.filter(
            gmail_account=account, status__in=["pending", "running"]
        ).aexists()
        if running:
            raise BadRequest(detail="A sync is already in progress")

        months = data.months if data.months in (3, 6, 12) else 12
        sync_job = await SyncJob.objects.acreate(gmail_account=account, sync_months=months)

        # Create pipeline steps
        from gmail.tasks import PIPELINE_STEPS
        for i, step_name in enumerate(PIPELINE_STEPS):
            await PipelineStep.objects.acreate(
                sync_job=sync_job, step_name=step_name, order=i
            )

        # Enqueue first task to arq
        from arq.connections import create_pool, RedisSettings
        import os
        pool = await create_pool(
            RedisSettings.from_dsn(os.environ.get("REDIS_URL", "redis://localhost:6379"))
        )
        await pool.enqueue_job("task_fetch", sync_job.pk)
        await pool.close()

        return SyncTriggerResponse(sync_job_id=sync_job.pk)


@api.viewset("/sync-jobs")
class SyncDetailViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def retrieve(self, request: Request, pk: int):
        """GET /api/gmail/sync-jobs/{pk}/ — poll sync progress with per-step detail"""
        user_id = int(request.context["user_id"])
        try:
            job = await SyncJob.objects.select_related("gmail_account").aget(pk=pk)
        except SyncJob.DoesNotExist:
            raise NotFound(detail="Sync job not found")

        if job.gmail_account.user_id != user_id:
            raise NotFound(detail="Sync job not found")

        steps = [
            PipelineStepSchema(
                step_name=s.step_name,
                status=s.status,
                total_items=s.total_items,
                processed_items=s.processed_items,
                error_count=s.error_count,
                error_message=s.error_message,
                started_at=s.started_at.isoformat() if s.started_at else None,
                completed_at=s.completed_at.isoformat() if s.completed_at else None,
            )
            async for s in job.steps.all().order_by("order")
        ]

        return SyncJobResponse(
            id=job.pk,
            status=job.status,
            total_messages=job.total_messages,
            processed_messages=job.processed_messages,
            new_messages=job.new_messages,
            extracted_count=job.extracted_count,
            error_message=job.error_message,
            started_at=job.started_at.isoformat(),
            completed_at=job.completed_at.isoformat() if job.completed_at else None,
            steps=steps,
        )


@api.viewset("/messages")
class MessageListViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(self, request: Request):
        """GET /api/gmail/messages/ — paginated email list"""
        user_id = int(request.context["user_id"])
        account = await _get_gmail_account(user_id)

        page = int(request.query.get("page", 1))
        page_size = int(request.query.get("page_size", 50))
        source_type = request.query.get("source_type")

        qs = EmailMessage.objects.filter(gmail_account=account).order_by("-received_at")
        if source_type:
            qs = qs.filter(source_type=source_type)

        total = await qs.acount()
        offset = (page - 1) * page_size
        messages = [
            m async for m in qs[offset:offset + page_size]
        ]

        items = [
            EmailMessageSchema(
                id=m.pk,
                message_id=m.message_id,
                sender=m.sender,
                subject=m.subject,
                received_at=m.received_at.isoformat(),
                snippet=m.snippet,
                source_type=m.source_type,
                is_processed=m.is_processed,
            )
            for m in messages
        ]
        return EmailMessageListSchema(items=items, total=total, page=page, page_size=page_size)


@api.viewset("/messages/{id}")
class MessageDetailViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def retrieve(self, request: Request, id: int):
        """GET /api/gmail/messages/{id}/ — single email + extracted data"""
        user_id = int(request.context["user_id"])
        try:
            msg = await EmailMessage.objects.select_related("gmail_account").aget(pk=id)
        except EmailMessage.DoesNotExist:
            raise NotFound(detail="Message not found")

        if msg.gmail_account.user_id != user_id:
            raise NotFound(detail="Message not found")

        extracted = [
            {"id": e.pk, "data_type": e.data_type, "data_json": e.data_json,
             "confidence": e.confidence, "is_verified": e.is_verified}
            async for e in msg.extracted_data.all()
        ]

        return EmailDetailSchema(
            id=msg.pk,
            message_id=msg.message_id,
            sender=msg.sender,
            subject=msg.subject,
            received_at=msg.received_at.isoformat(),
            snippet=msg.snippet,
            source_type=msg.source_type,
            is_processed=msg.is_processed,
            extracted_data=extracted,
        )


@api.viewset("/rules")
class SenderRuleListViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(self, request: Request):
        """GET /api/gmail/rules/ — list sender rules"""
        user_id = int(request.context["user_id"])
        account = await _get_gmail_account(user_id)

        rules = [
            SenderRuleSchema(
                id=r.pk,
                sender_pattern=r.sender_pattern,
                source_type=r.source_type,
                is_enabled=r.is_enabled,
                subject_pattern=r.subject_pattern,
                require_attachment=r.require_attachment,
                priority=r.priority,
            )
            async for r in account.sender_rules.all().order_by("source_type", "sender_pattern")
        ]
        return rules

    async def create(self, request: Request, data: CreateSenderRuleRequest):
        """POST /api/gmail/rules/ — create sender rule"""
        user_id = int(request.context["user_id"])
        account = await _get_gmail_account(user_id)

        rule = await EmailSenderRule.objects.acreate(
            gmail_account=account,
            sender_pattern=data.sender_pattern,
            source_type=data.source_type,
            is_enabled=data.is_enabled,
            subject_pattern=data.subject_pattern,
            require_attachment=data.require_attachment,
            priority=data.priority,
        )
        return SenderRuleSchema(
            id=rule.pk,
            sender_pattern=rule.sender_pattern,
            source_type=rule.source_type,
            is_enabled=rule.is_enabled,
            subject_pattern=rule.subject_pattern,
            require_attachment=rule.require_attachment,
            priority=rule.priority,
        )


@api.viewset("/rules/{id}")
class SenderRuleDetailViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def update(self, request: Request, id: int, data: UpdateSenderRuleRequest):
        """PATCH /api/gmail/rules/{id}/ — toggle rule"""
        user_id = int(request.context["user_id"])
        account = await _get_gmail_account(user_id)

        try:
            rule = await EmailSenderRule.objects.aget(pk=id, gmail_account=account)
        except EmailSenderRule.DoesNotExist:
            raise NotFound(detail="Rule not found")

        if data.is_enabled is not None:
            rule.is_enabled = data.is_enabled
        if data.source_type is not None:
            rule.source_type = data.source_type
        if data.subject_pattern is not None:
            rule.subject_pattern = data.subject_pattern
        if data.require_attachment is not None:
            rule.require_attachment = data.require_attachment
        if data.priority is not None:
            rule.priority = data.priority
        await rule.asave()

        return SenderRuleSchema(
            id=rule.pk,
            sender_pattern=rule.sender_pattern,
            source_type=rule.source_type,
            is_enabled=rule.is_enabled,
            subject_pattern=rule.subject_pattern,
            require_attachment=rule.require_attachment,
            priority=rule.priority,
        )

    async def delete(self, request: Request, id: int):
        """DELETE /api/gmail/rules/{id}/ — delete rule"""
        user_id = int(request.context["user_id"])
        account = await _get_gmail_account(user_id)

        try:
            rule = await EmailSenderRule.objects.aget(pk=id, gmail_account=account)
        except EmailSenderRule.DoesNotExist:
            raise NotFound(detail="Rule not found")

        await sync_to_async(rule.delete)()
        return {"deleted": True}


@api.viewset("/extracted")
class ExtractedDataViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(self, request: Request):
        """GET /api/gmail/extracted/ — extracted data, filterable by data_type"""
        user_id = int(request.context["user_id"])
        account = await _get_gmail_account(user_id)

        qs = ExtractedFinancialData.objects.filter(
            email__gmail_account=account
        ).order_by("-created_at")

        data_type = request.query.get("data_type")
        if data_type:
            qs = qs.filter(data_type=data_type)

        items = [
            ExtractedDataSchema(
                id=e.pk,
                email_id=e.email_id,
                data_type=e.data_type,
                data_json=e.data_json,
                confidence=e.confidence,
                is_verified=e.is_verified,
                created_at=e.created_at.isoformat(),
            )
            async for e in qs[:200]
        ]
        return items


@api.viewset("/extracted/{id}/verify")
class ExtractedDataVerifyViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def create(self, request: Request, id: int):
        """POST /api/gmail/extracted/{id}/verify/ — user confirms extracted data"""
        user_id = int(request.context["user_id"])

        try:
            item = await ExtractedFinancialData.objects.select_related(
                "email__gmail_account"
            ).aget(pk=id)
        except ExtractedFinancialData.DoesNotExist:
            raise NotFound(detail="Extracted data not found")

        if item.email.gmail_account.user_id != user_id:
            raise NotFound(detail="Extracted data not found")

        item.is_verified = True
        await item.asave(update_fields=["is_verified"])
        return {"verified": True}


@api.viewset("/investments")
class InvestmentSummaryViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(self, request: Request):
        """GET /api/gmail/investments/ — aggregated MF holdings from Groww emails"""
        user_id = int(request.context["user_id"])
        account = await _get_gmail_account(user_id)

        investments = await _run_sync(_aggregate_investments, account.pk)
        return investments


def _aggregate_investments(account_id: int) -> InvestmentSummarySchema:
    """Aggregate SIP purchase emails into holdings."""
    from collections import defaultdict

    purchases = ExtractedFinancialData.objects.filter(
        email__gmail_account_id=account_id,
        data_type="investment_update",
        data_json__transaction_type="sip_purchase",
    ).order_by("email__received_at")

    # Group by scheme name
    schemes: dict[str, dict] = defaultdict(lambda: {
        "total_units": 0.0,
        "total_invested": 0.0,
        "latest_nav": 0.0,
        "sip_count": 0,
        "last_allocated": "",
    })

    for item in purchases:
        d = item.data_json
        name = d.get("scheme_name", "Unknown")
        units = d.get("units") or 0
        amount = d.get("amount") or 0
        nav = d.get("nav") or 0

        schemes[name]["total_units"] += units
        schemes[name]["total_invested"] += amount
        if nav > 0:
            schemes[name]["latest_nav"] = nav
        schemes[name]["sip_count"] += 1
        if item.email.received_at:
            schemes[name]["last_allocated"] = item.email.received_at.isoformat()

    holdings = []
    total_invested = 0.0
    total_current = 0.0

    for name, data in schemes.items():
        current_value = data["total_units"] * data["latest_nav"] if data["latest_nav"] > 0 else data["total_invested"]
        pnl = current_value - data["total_invested"]
        pnl_pct = (pnl / data["total_invested"] * 100) if data["total_invested"] > 0 else 0.0

        holdings.append(MFHoldingSchema(
            scheme_name=name,
            total_units=round(data["total_units"], 4),
            total_invested=round(data["total_invested"], 2),
            latest_nav=round(data["latest_nav"], 4),
            current_value=round(current_value, 2),
            pnl=round(pnl, 2),
            pnl_pct=round(pnl_pct, 2),
            sip_count=data["sip_count"],
            last_allocated=data["last_allocated"],
        ))

        total_invested += data["total_invested"]
        total_current += current_value

    # Sort by current value descending
    holdings.sort(key=lambda h: h.current_value, reverse=True)

    total_pnl = total_current - total_invested
    total_pnl_pct = (total_pnl / total_invested * 100) if total_invested > 0 else 0.0

    # Get upcoming SIPs
    upcoming = []
    sip_dues = ExtractedFinancialData.objects.filter(
        email__gmail_account_id=account_id,
        data_type="investment_update",
        data_json__transaction_type="sip_due",
    ).order_by("-email__received_at")[:10]

    for item in sip_dues:
        d = item.data_json
        upcoming.append({
            "scheme_name": d.get("scheme_name", ""),
            "amount": d.get("amount"),
            "due_date": d.get("due_date", ""),
        })

    return InvestmentSummarySchema(
        total_invested=round(total_invested, 2),
        total_current=round(total_current, 2),
        total_pnl=round(total_pnl, 2),
        total_pnl_pct=round(total_pnl_pct, 2),
        holdings_count=len(holdings),
        holdings=holdings,
        upcoming_sips=upcoming,
    )
