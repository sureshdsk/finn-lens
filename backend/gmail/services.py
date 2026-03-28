from __future__ import annotations

import base64
import email.utils
import logging
from datetime import datetime, timezone
from typing import Any

from django.utils import timezone as dj_timezone
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from banking.constants import CC_DOMAINS

from .encryption import decrypt_token, encrypt_token
from .models import EmailAttachment, EmailMessage, ExtractedFinancialData, GmailAccount, SyncJob
from .parsers import classify_sender, parse_email, set_bank_statement_password_fn, set_cc_password_fn

logger = logging.getLogger(__name__)

MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024  # 5MB


def get_gmail_service(account: GmailAccount):
    """Build authenticated Gmail API client, auto-refreshing if needed."""
    from django.conf import settings

    refresh_token = decrypt_token(account.refresh_token)

    creds = Credentials(
        token=account.access_token or None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
    )

    if not creds.valid:
        creds.refresh(GoogleRequest())
        account.access_token = creds.token or ""
        account.token_expiry = creds.expiry
        account.refresh_token = encrypt_token(creds.refresh_token) if creds.refresh_token else account.refresh_token
        account.save(update_fields=["access_token", "token_expiry", "refresh_token"])

    return build("gmail", "v1", credentials=creds)


_BANK_STATEMENT_SENDERS = {"estatement@icicibank.com"}


class AttachmentHandler:
    """Downloads and stores PDF attachments from CC and bank statement emails."""

    def store(self, service: Any, email_obj: EmailMessage, payload: dict) -> None:
        sender_lower = email_obj.sender.lower()
        is_cc = any(domain in sender_lower for domain in CC_DOMAINS)
        is_bank_stmt = any(s in sender_lower for s in _BANK_STATEMENT_SENDERS)
        if not is_cc and not is_bank_stmt:
            return

        parts: list[dict] = []
        self._find_parts(payload, parts)

        for part in parts:
            self._store_part(service, email_obj, part)

    def _find_parts(self, payload: dict, results: list[dict]) -> None:
        filename = payload.get("filename")
        if filename and payload.get("body", {}).get("attachmentId"):
            results.append(payload)
        for part in payload.get("parts", []):
            self._find_parts(part, results)

    def _store_part(self, service: Any, email_obj: EmailMessage, part: dict) -> None:
        filename = part.get("filename", "")
        content_type = part.get("mimeType", "")
        attachment_id = part.get("body", {}).get("attachmentId", "")
        size = part.get("body", {}).get("size", 0)

        if not attachment_id:
            return
        if content_type != "application/pdf" and not filename.lower().endswith(".pdf"):
            return
        if size > MAX_ATTACHMENT_SIZE:
            return

        att_data = service.users().messages().attachments().get(
            userId="me", messageId=email_obj.message_id, id=attachment_id
        ).execute()
        raw_bytes = base64.urlsafe_b64decode(att_data.get("data", ""))

        EmailAttachment.objects.create(
            email=email_obj,
            filename=filename,
            content_type=content_type,
            attachment_id=attachment_id,
            size_bytes=len(raw_bytes),
            pdf_bytes=raw_bytes,
        )


class MessageStore:
    """Fetches and stores individual Gmail messages."""

    def __init__(self) -> None:
        self._attachment_handler = AttachmentHandler()

    def store(self, service: Any, account: GmailAccount, msg_id: str) -> EmailMessage:
        msg = service.users().messages().get(
            userId="me", id=msg_id, format="full"
        ).execute()

        headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
        sender = headers.get("from", "")
        subject = headers.get("subject", "")
        date_str = headers.get("date", "")

        received_at = datetime.now(tz=timezone.utc)
        if date_str:
            parsed = email.utils.parsedate_to_datetime(date_str)
            if parsed:
                received_at = parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)

        body_html = self._extract_body(msg.get("payload", {}))

        email_obj = EmailMessage.objects.create(
            gmail_account=account,
            message_id=msg_id,
            thread_id=msg.get("threadId", ""),
            sender=sender,
            subject=subject,
            received_at=received_at,
            snippet=msg.get("snippet", ""),
            raw_html=body_html,
        )

        self._attachment_handler.store(service, email_obj, msg.get("payload", {}))
        return email_obj

    @staticmethod
    def _extract_body(payload: dict) -> str:
        mime_type = payload.get("mimeType", "")

        if mime_type == "text/html":
            data = payload.get("body", {}).get("data", "")
            if data:
                return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")

        if mime_type == "text/plain" and "parts" not in payload:
            data = payload.get("body", {}).get("data", "")
            if data:
                return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")

        for part in payload.get("parts", []):
            result = MessageStore._extract_body(part)
            if result:
                return result
        return ""


class GmailFetcher:
    """Handles initial and incremental message fetching."""

    def __init__(self) -> None:
        self._message_store = MessageStore()

    def fetch_initial(self, account: GmailAccount, sync_job: SyncJob, months: int = 12) -> None:
        service = get_gmail_service(account)

        rules = list(account.sender_rules.filter(is_enabled=True))
        if not rules:
            return

        domains: set[str] = set()
        for rule in rules:
            pattern = rule.sender_pattern
            domains.add(pattern[2:] if pattern.startswith("*@") else pattern)

        query = f"from:({' OR '.join(domains)}) newer_than:{months}m"
        logger.info(f"Initial fetch: {len(domains)} domains, {months} months, query={query[:120]}")
        self._fetch_messages(service, account, sync_job, query)

    def fetch_incremental(self, account: GmailAccount, sync_job: SyncJob) -> None:
        service = get_gmail_service(account)

        try:
            history = service.users().history().list(
                userId="me",
                startHistoryId=account.last_history_id,
                historyTypes=["messageAdded"],
            ).execute()
        except Exception:
            account.last_history_id = ""
            account.save(update_fields=["last_history_id"])
            self.fetch_initial(account, sync_job, months=1)
            return

        message_ids: set[str] = set()
        for record in history.get("history", []):
            for msg in record.get("messagesAdded", []):
                message_ids.add(msg["message"]["id"])

        if not message_ids:
            return

        sync_job.total_messages = len(message_ids)
        sync_job.save(update_fields=["total_messages"])

        for i, msg_id in enumerate(message_ids):
            if EmailMessage.objects.filter(message_id=msg_id).exists():
                continue
            try:
                self._message_store.store(service, account, msg_id)
            except Exception as exc:
                logger.warning(f"Skipping message {msg_id}: {exc}")
                sync_job.processed_messages = i + 1
                sync_job.save(update_fields=["processed_messages"])
                continue
            sync_job.processed_messages = i + 1
            sync_job.new_messages += 1
            sync_job.save(update_fields=["processed_messages", "new_messages"])

        new_history_id = history.get("historyId", "")
        if new_history_id:
            account.last_history_id = new_history_id
            account.save(update_fields=["last_history_id"])

    def _fetch_messages(self, service: Any, account: GmailAccount, sync_job: SyncJob, query: str) -> None:
        all_ids: list[str] = []
        page_token = None
        while True:
            resp = service.users().messages().list(
                userId="me", q=query, pageToken=page_token, maxResults=500
            ).execute()
            all_ids.extend(m["id"] for m in resp.get("messages", []))
            page_token = resp.get("nextPageToken")
            if not page_token:
                break

        sync_job.total_messages = len(all_ids)
        sync_job.save(update_fields=["total_messages"])
        logger.info(f"Found {len(all_ids)} messages to fetch")

        # Get the pipeline step for live progress updates to UI
        fetch_step = sync_job.steps.filter(step_name="fetch").first()
        if fetch_step:
            fetch_step.total_items = len(all_ids)
            fetch_step.save(update_fields=["total_items"])

        new_count = 0
        for i, msg_id in enumerate(all_ids):
            if EmailMessage.objects.filter(message_id=msg_id).exists():
                sync_job.processed_messages = i + 1
                sync_job.save(update_fields=["processed_messages"])
                if fetch_step and (i + 1) % 10 == 0:
                    fetch_step.processed_items = i + 1
                    fetch_step.save(update_fields=["processed_items"])
                continue

            try:
                self._message_store.store(service, account, msg_id)
            except Exception as exc:
                logger.warning(f"Skipping message {msg_id}: {exc}")
                sync_job.processed_messages = i + 1
                sync_job.save(update_fields=["processed_messages"])
                continue
            new_count += 1
            sync_job.processed_messages = i + 1
            sync_job.new_messages = new_count
            sync_job.save(update_fields=["processed_messages", "new_messages"])

            if fetch_step and (i + 1) % 10 == 0:
                fetch_step.processed_items = i + 1
                fetch_step.save(update_fields=["processed_items"])

            if (i + 1) % 50 == 0:
                logger.info(f"Fetch progress: {i + 1}/{len(all_ids)} ({new_count} new)")

        # Final update
        if fetch_step:
            fetch_step.processed_items = len(all_ids)
            fetch_step.save(update_fields=["processed_items"])

        logger.info(f"Fetch complete: {len(all_ids)} processed, {new_count} new")
        profile = service.users().getProfile(userId="me").execute()
        account.last_history_id = profile.get("historyId", "")
        account.save(update_fields=["last_history_id"])


class GmailSyncService:
    """Orchestrates the full sync pipeline: fetch → classify → parse → materialize."""

    def __init__(self) -> None:
        self._fetcher = GmailFetcher()

    def sync(self, account: GmailAccount, sync_job: SyncJob) -> None:
        try:
            # Phase 1: Fetch
            sync_job.status = "fetching"
            sync_job.save(update_fields=["status"])

            if not account.last_history_id:
                self._fetcher.fetch_initial(account, sync_job)
            else:
                self._fetcher.fetch_incremental(account, sync_job)

            # Phase 2: Classify senders
            sync_job.status = "classifying"
            sync_job.save(update_fields=["status"])

            rules = list(account.sender_rules.filter(is_enabled=True))
            unprocessed = EmailMessage.objects.filter(
                gmail_account=account, is_processed=False
            )
            for msg in unprocessed:
                source_type = classify_sender(msg.sender, rules)
                msg.source_type = source_type.value
                msg.save(update_fields=["source_type"])

            # Phase 3: Parse emails
            sync_job.status = "parsing"
            sync_job.save(update_fields=["status"])

            # Set up statement passwords from Family cardholder info
            self._setup_cc_passwords(account.user_id)
            self._setup_bank_statement_passwords(account.user_id)

            extracted_count = 0
            for msg in unprocessed:
                pdf_attachments = [
                    bytes(att.pdf_bytes)
                    for att in msg.attachments.filter(pdf_bytes__isnull=False)
                ]
                results = parse_email(
                    msg.sender, msg.subject, msg.raw_html or msg.snippet,
                    attachments=pdf_attachments or None,
                )
                for result in results:
                    ExtractedFinancialData.objects.create(
                        email=msg,
                        data_type=result.data_type.value,
                        data_json=result.to_json(),
                        confidence=result.confidence,
                    )
                    extracted_count += 1
                msg.is_processed = True
                msg.save(update_fields=["is_processed"])

            # Phase 4: Materialize extracted data
            if extracted_count > 0:
                self._materialize_and_classify_cc(account.user_id)
                self._materialize_bank_statements(account.user_id)

            # Done
            sync_job.status = "completed"
            sync_job.extracted_count = extracted_count
            sync_job.completed_at = dj_timezone.now()
            sync_job.save(update_fields=["status", "extracted_count", "completed_at"])

            account.last_sync_at = dj_timezone.now()
            account.save(update_fields=["last_sync_at"])

        except Exception as e:
            sync_job.status = "failed"
            sync_job.error_message = str(e)
            sync_job.completed_at = dj_timezone.now()
            sync_job.save(update_fields=["status", "error_message", "completed_at"])
            raise

    @staticmethod
    def _setup_cc_passwords(user_id: int) -> None:
        try:
            from banking.models import Family
            family = Family.objects.get(owner_id=user_id)
            if family.cardholder_name and family.cardholder_dob:
                set_cc_password_fn(family.get_cc_statement_password)
        except Exception:
            pass

    @staticmethod
    def _setup_bank_statement_passwords(user_id: int) -> None:
        try:
            from banking.models import Family
            family = Family.objects.get(owner_id=user_id)
            if family.cardholder_name and family.cardholder_dob:
                set_bank_statement_password_fn(family.get_bank_statement_password)
        except Exception:
            pass

    @staticmethod
    def _materialize_and_classify_cc(user_id: int) -> None:
        try:
            from banking.cc_services import CCMaterializer, CCClassifier
            from banking.models import CreditCard

            materializer = CCMaterializer()
            result = materializer.materialize(user_id)
            logger.info(f"CC materialize: {result}")

            if result["transactions"] > 0:
                classifier = CCClassifier()
                for card in CreditCard.objects.filter(family__owner_id=user_id):
                    classifier.classify(card.pk)
        except Exception as e:
            logger.warning(f"CC materialize/classify failed: {e}")

    @staticmethod
    def _materialize_bank_statements(user_id: int) -> None:
        try:
            from banking.bank_statement_services import BankStatementMaterializer

            materializer = BankStatementMaterializer()
            result = materializer.materialize(user_id)
            logger.info(f"Bank statement materialize: {result}")
        except Exception as e:
            logger.warning(f"Bank statement materialize failed: {e}")


# ── Module-level aliases for backward compatibility ──────────────────────────

_default_service = GmailSyncService()


def sync_emails(account: GmailAccount, sync_job: SyncJob) -> None:
    _default_service.sync(account, sync_job)
