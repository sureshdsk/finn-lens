import re
from dataclasses import dataclass


@dataclass
class RegexResult:
    payment_channel: str
    upi_handle: str


_CHANNEL_RE = re.compile(r"^(UPI|NEFT|IMPS|CMS|RTGS|ACH)", re.IGNORECASE)
_UPI_HANDLE_RE = re.compile(r"[/\-]([a-zA-Z0-9._]+@[a-zA-Z]+)[/\-\s]")


def extract_regex(description: str) -> RegexResult:
    channel = ""
    m = _CHANNEL_RE.search(description)
    if m:
        channel = m.group(1).upper()

    handle = ""
    m = _UPI_HANDLE_RE.search(description)
    if m:
        handle = m.group(1).lower()

    return RegexResult(payment_channel=channel, upi_handle=handle)
