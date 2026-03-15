from __future__ import annotations

import base64
import email.utils
from datetime import datetime, timezone

from django.utils import timezone as dj_timezone
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from .encryption import decrypt_token, encrypt_token
from .models import EmailMessage, ExtractedFinancialData, GmailAccount, SyncJob
from .parsers import classify_sender, parse_email


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
        # Update stored tokens
        account.access_token = creds.token or ""
        account.token_expiry = creds.expiry
        account.refresh_token = encrypt_token(creds.refresh_token) if creds.refresh_token else account.refresh_token
        account.save(update_fields=["access_token", "token_expiry", "refresh_token"])

    return build("gmail", "v1", credentials=creds)


def sync_emails(account: GmailAccount, sync_job: SyncJob):
    """Orchestrate full sync: fetch → classify → parse."""
    try:
        # Phase 1: Fetch
        sync_job.status = "fetching"
        sync_job.save(update_fields=["status"])

        if not account.last_history_id:
            fetch_emails_initial(account, sync_job)
        else:
            fetch_emails_incremental(account, sync_job)

        # Phase 2: Classify
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

        # Phase 3: Parse
        sync_job.status = "parsing"
        sync_job.save(update_fields=["status"])

        extracted_count = 0
        for msg in unprocessed:
            results = parse_email(msg.sender, msg.subject, msg.raw_html or msg.snippet)
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


def fetch_emails_initial(account: GmailAccount, sync_job: SyncJob, months: int = 12):
    """Initial sync: fetch last N months of emails from known senders."""
    service = get_gmail_service(account)

    # Build query from enabled sender rules
    rules = list(account.sender_rules.filter(is_enabled=True))
    if not rules:
        return

    # Extract domains from patterns
    domains = set()
    for rule in rules:
        pattern = rule.sender_pattern
        if pattern.startswith("*@"):
            domains.add(pattern[2:])
        else:
            domains.add(pattern)

    query = f"from:({' OR '.join(domains)}) newer_than:{months}m"

    _fetch_messages(service, account, sync_job, query)


def fetch_emails_incremental(account: GmailAccount, sync_job: SyncJob):
    """Incremental sync using Gmail History API."""
    service = get_gmail_service(account)

    try:
        history = service.users().history().list(
            userId="me",
            startHistoryId=account.last_history_id,
            historyTypes=["messageAdded"],
        ).execute()
    except Exception:
        # History ID expired, fall back to initial sync
        account.last_history_id = ""
        account.save(update_fields=["last_history_id"])
        fetch_emails_initial(account, sync_job, months=1)
        return

    message_ids = set()
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
        _store_message(service, account, msg_id)
        sync_job.processed_messages = i + 1
        sync_job.new_messages += 1
        sync_job.save(update_fields=["processed_messages", "new_messages"])

    # Update history ID
    new_history_id = history.get("historyId", "")
    if new_history_id:
        account.last_history_id = new_history_id
        account.save(update_fields=["last_history_id"])


def _fetch_messages(service, account: GmailAccount, sync_job: SyncJob, query: str):
    """Fetch messages matching query, store them."""
    # List all matching message IDs
    all_ids = []
    page_token = None
    while True:
        resp = service.users().messages().list(
            userId="me", q=query, pageToken=page_token, maxResults=500
        ).execute()
        messages = resp.get("messages", [])
        all_ids.extend(m["id"] for m in messages)
        page_token = resp.get("nextPageToken")
        if not page_token:
            break

    sync_job.total_messages = len(all_ids)
    sync_job.save(update_fields=["total_messages"])

    new_count = 0
    for i, msg_id in enumerate(all_ids):
        if EmailMessage.objects.filter(message_id=msg_id).exists():
            sync_job.processed_messages = i + 1
            sync_job.save(update_fields=["processed_messages"])
            continue

        _store_message(service, account, msg_id)
        new_count += 1
        sync_job.processed_messages = i + 1
        sync_job.new_messages = new_count
        sync_job.save(update_fields=["processed_messages", "new_messages"])

    # Store history ID from profile for future incremental syncs
    profile = service.users().getProfile(userId="me").execute()
    account.last_history_id = profile.get("historyId", "")
    account.save(update_fields=["last_history_id"])


def _store_message(service, account: GmailAccount, msg_id: str):
    """Fetch full message details and store."""
    msg = service.users().messages().get(
        userId="me", id=msg_id, format="full"
    ).execute()

    headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
    sender = headers.get("from", "")
    subject = headers.get("subject", "")
    date_str = headers.get("date", "")

    # Parse date
    received_at = datetime.now(tz=timezone.utc)
    if date_str:
        parsed = email.utils.parsedate_to_datetime(date_str)
        if parsed:
            received_at = parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)

    # Extract HTML body
    body_html = _extract_body(msg.get("payload", {}))

    EmailMessage.objects.create(
        gmail_account=account,
        message_id=msg_id,
        thread_id=msg.get("threadId", ""),
        sender=sender,
        subject=subject,
        received_at=received_at,
        snippet=msg.get("snippet", ""),
        raw_html=body_html,
    )


def _extract_body(payload: dict) -> str:
    """Recursively extract HTML or plain text body from Gmail payload."""
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
        result = _extract_body(part)
        if result:
            return result

    return ""
