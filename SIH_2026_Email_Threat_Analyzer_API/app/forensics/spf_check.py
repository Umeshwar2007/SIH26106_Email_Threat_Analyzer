from datetime import datetime
import re
from typing import Optional
from app.core.config import DNS_TIMEOUT_SECONDS
from app.models import AuthCheckResult

def check_spf(
    source_ip: str,
    sender_domain: str,
    mail_from: str,
    raw_headers: str,
) -> AuthCheckResult:
    """
    Perform SPF analysis.
    Correlates upstream receiving MX authentication headers and dynamic SPF evaluation.
    If required information is unavailable, returns 'not_checked'.
    """
    now_str = datetime.utcnow().isoformat() + "Z"
    raw_lower = raw_headers.lower()

    # 1. Inspect upstream authenticated headers stamped by receiving MX (e.g. Gmail, Outlook, Postfix)
    spf_header_match = re.search(r'received-spf:\s*([a-z]+)\s*([^\r\n]+)?', raw_lower)
    if spf_header_match:
        verdict = spf_header_match.group(1).lower()
        detail = (spf_header_match.group(2) or "").strip()
        if verdict in ("pass", "fail", "softfail", "neutral", "none", "temperror", "permerror"):
            return AuthCheckResult(
                status=verdict,
                passed=(verdict == "pass"),
                reason=f"Upstream receiving MX verified: {verdict.upper()} ({detail[:120]})",
                domain=sender_domain or None,
                checked_at=now_str,
            )

    auth_match = re.search(r'spf=([a-z]+)', raw_lower)
    if auth_match:
        verdict = auth_match.group(1).lower()
        if verdict in ("pass", "fail", "softfail", "neutral", "none", "temperror", "permerror"):
            return AuthCheckResult(
                status=verdict,
                passed=(verdict == "pass"),
                reason=f"Validated via Authentication-Results header (SPF {verdict.upper()})",
                domain=sender_domain or None,
                checked_at=now_str,
            )

    # If no upstream headers and source IP or sender domain is missing/local
    if not sender_domain or not source_ip or source_ip in ("127.0.0.1", "0.0.0.0"):
        return AuthCheckResult(
            status="not_checked",
            passed=None,
            reason="Source IP or sender domain unavailable for live SPF query.",
            domain=sender_domain or None,
            checked_at=now_str,
        )

    # 2. Dynamic live query using pyspf if available
    try:
        import spf
        res, code, exp = spf.check2(i=source_ip, s=mail_from or f"postmaster@{sender_domain}", h=sender_domain)
        valid_statuses = ("pass", "fail", "softfail", "neutral", "none", "temperror", "permerror")
        status = res.lower() if res.lower() in valid_statuses else "error"
        return AuthCheckResult(
            status=status,
            passed=(status == "pass"),
            reason=f"Dynamic SPF query: {status.upper()} - {exp} (Code {code})",
            domain=sender_domain,
            checked_at=now_str,
        )
    except Exception as e:
        return AuthCheckResult(
            status="not_checked",
            passed=None,
            reason=f"DNS query unavailable or timed out ({str(e)[:60]}).",
            domain=sender_domain,
            checked_at=now_str,
        )
