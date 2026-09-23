from datetime import datetime
import re
from typing import Optional
from app.models import AuthCheckResult

def check_dmarc(
    sender_domain: str,
    spf_result: AuthCheckResult,
    dkim_result: AuthCheckResult,
    raw_headers: str,
) -> AuthCheckResult:
    """
    Perform DMARC policy alignment and verification.
    Correlates upstream receiving MX verdict, published policy, and SPF/DKIM alignment.
    """
    now_str = datetime.utcnow().isoformat() + "Z"

    if not sender_domain:
        return AuthCheckResult(
            status="not_checked",
            passed=None,
            reason="No sender domain available to evaluate DMARC policy.",
            domain=None,
            checked_at=now_str,
        )

    raw_lower = raw_headers.lower()

    # 1. Inspect upstream receiving MX verdict
    auth_dmarc_match = re.search(r'dmarc=([a-z]+)', raw_lower)
    if auth_dmarc_match:
        verdict = auth_dmarc_match.group(1).lower()
        if verdict in ("pass", "fail", "none"):
            return AuthCheckResult(
                status=verdict,
                passed=(verdict == "pass"),
                reason=f"Upstream receiving MX evaluated: DMARC {verdict.upper()}",
                domain=sender_domain,
                checked_at=now_str,
            )

    # 2. Correlate local SPF & DKIM results
    if spf_result.status == "pass" and dkim_result.status == "pass":
        return AuthCheckResult(
            status="pass",
            passed=True,
            reason=f"DMARC PASS: Both SPF and DKIM verified alignment for domain '{sender_domain}'.",
            domain=sender_domain,
            checked_at=now_str,
        )
    elif spf_result.status == "fail" and dkim_result.status == "fail":
        return AuthCheckResult(
            status="fail",
            passed=False,
            reason=f"DMARC FAIL: Both SPF and DKIM failed alignment for domain '{sender_domain}'.",
            domain=sender_domain,
            checked_at=now_str,
        )

    # 3. Dynamic lookup via checkdmarc if available
    try:
        import checkdmarc
        res = checkdmarc.check_dmarc(sender_domain)
        if res.get("valid", False):
            policy = res.get("record", {}).get("p", "none")
            # If at least one passed and policy is valid
            if spf_result.status == "pass" or dkim_result.status == "pass":
                return AuthCheckResult(
                    status="pass",
                    passed=True,
                    reason=f"DMARC PASS: Valid policy '{policy}' published and authentication aligned.",
                    domain=sender_domain,
                    checked_at=now_str,
                )
            else:
                return AuthCheckResult(
                    status="none",
                    passed=False,
                    reason=f"DMARC policy '{policy}' published on domain '{sender_domain}', but authentication unaligned.",
                    domain=sender_domain,
                    checked_at=now_str,
                )
    except Exception:
        pass

    # If verification cannot be reliably established
    if spf_result.status == "not_checked" and dkim_result.status == "not_checked":
        return AuthCheckResult(
            status="not_checked",
            passed=None,
            reason=f"DMARC could not be evaluated because prerequisite SPF and DKIM records are not_checked.",
            domain=sender_domain,
            checked_at=now_str,
        )

    return AuthCheckResult(
        status="none",
        passed=False,
        reason=f"No conclusive DMARC alignment record found for domain '{sender_domain}'.",
        domain=sender_domain,
        checked_at=now_str,
    )
