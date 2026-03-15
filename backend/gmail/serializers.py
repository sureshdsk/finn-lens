import msgspec
from typing import Optional


class GmailStatusResponse(msgspec.Struct):
    connected: bool
    email: str = ""
    last_sync_at: Optional[str] = None
    is_active: bool = False


class SyncJobResponse(msgspec.Struct):
    id: int
    status: str
    total_messages: int
    processed_messages: int
    new_messages: int
    extracted_count: int
    error_message: str
    started_at: str
    completed_at: Optional[str] = None


class SyncTriggerResponse(msgspec.Struct):
    sync_job_id: int


class EmailMessageSchema(msgspec.Struct):
    id: int
    message_id: str
    sender: str
    subject: str
    received_at: str
    snippet: str
    source_type: str
    is_processed: bool


class EmailMessageListSchema(msgspec.Struct):
    items: list[EmailMessageSchema]
    total: int
    page: int
    page_size: int


class EmailDetailSchema(msgspec.Struct):
    id: int
    message_id: str
    sender: str
    subject: str
    received_at: str
    snippet: str
    source_type: str
    is_processed: bool
    extracted_data: list[dict]


class SenderRuleSchema(msgspec.Struct):
    id: int
    sender_pattern: str
    source_type: str
    is_enabled: bool


class CreateSenderRuleRequest(msgspec.Struct):
    sender_pattern: str
    source_type: str
    is_enabled: bool = True


class UpdateSenderRuleRequest(msgspec.Struct):
    is_enabled: Optional[bool] = None
    source_type: Optional[str] = None


class ExtractedDataSchema(msgspec.Struct):
    id: int
    email_id: int
    data_type: str
    data_json: dict
    confidence: float
    is_verified: bool
    created_at: str


class MFHoldingSchema(msgspec.Struct):
    scheme_name: str
    total_units: float
    total_invested: float
    latest_nav: float
    current_value: float
    pnl: float
    pnl_pct: float
    sip_count: int
    last_allocated: str


class InvestmentSummarySchema(msgspec.Struct):
    total_invested: float
    total_current: float
    total_pnl: float
    total_pnl_pct: float
    holdings_count: int
    holdings: list[MFHoldingSchema]
    upcoming_sips: list[dict]
