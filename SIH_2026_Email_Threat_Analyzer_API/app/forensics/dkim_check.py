from datetime import datetime
import re
from typing import Optional
from app.models import AuthCheckResult

def check_dkim(
    raw_bytes: bytes,
    raw_headers: str,
    sender_domain: Optional[str] = None,
) -> AuthCheckResult:
    """
    Perform DKIM verification.
    Uses original raw bytes with dkimpy and evaluates upstream Authentication-Results.
    """
    now_str = datetime.utcnow().isoformat() + "Z"
    raw_lower = raw_headers.lower()

    # Check for DKIM-Signature header existence
    has_dkim_sig = "dkim-signature:" in raw_lower

    if not has_dkim_sig:
        return AuthCheckResult(
            status="none",
            passed=False,
            reason="No DKIM-Signature header present in the message envelope.",
            domain=sender_domain,
            checked_at=now_str,
        )

    # 1. Inspect upstream authenticated DKIM verdict from receiving MX
    auth_dkim_match = re.search(r'dkim=([a-z]+)', raw_lower)
    if auth_dkim_match:
        verdict = auth_dkim_match.group(1).lower()
        if verdict in ("pass", "fail", "neutral", "none", "temperror", "permerror"):
            status = verdict if verdict in ("pass", "fail", "none") else "not_checked"
            return AuthCheckResult(
                status=status,
                passed=(verdict == "pass"),
                reason=f"Upstream receiving MX verified: DKIM {verdict.upper()}",
                domain=sender_domain,
                checked_at=now_str,
            )

    # 2. Dynamic live verification via dkimpy
    try:
        import dkim
        is_valid = dkim.verify(raw_bytes)
        if is_valid:
            return AuthCheckResult(
                status="pass",
                passed=True,
                reason="Cryptographic signature verified against DNS public key.",
                domain=sender_domain,
                checked_at=now_str,
            )
        else:
            return AuthCheckResult(
                status="fail",
                passed=False,
                reason="Cryptographic signature verification failed (body or header hash mismatch).",
                domain=sender_domain,
                checked_at=now_str,
            )
    except Exception as e:
        return AuthCheckResult(
            status="not_checked",
            passed=None,
            reason=f"DKIM-Signature present, but DNS public key query could not complete ({str(e)[:50]}).",
            domain=sender_domain,
            checked_at=now_str,
        )
