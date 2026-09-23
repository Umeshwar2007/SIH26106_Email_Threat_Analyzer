import email
from pathlib import Path
from app.services.case_service import CaseService

def find_real_internshala_file() -> Path:
    sample_path = Path(__file__).resolve().parent.parent / "sample_emails" / "internshala.eml"
    if sample_path.exists():
        return sample_path

    workspace_root = Path(r"C:\Users\Umesh\Desktop\SIH_2026_Email_Threat_Analyzer")
    for candidate in workspace_root.rglob("*.eml"):
        if "evidence_store" in str(candidate):
            continue
        try:
            content = candidate.read_bytes()
            if b"internshala" in content.lower():
                return candidate
        except Exception:
            continue

    raise FileNotFoundError("Internshala .eml file could not be located.")

def test_real_internshala_email_forensics():
    file_path = find_real_internshala_file()
    assert file_path.exists(), f"Target real email must exist: {file_path}"

    raw_bytes = file_path.read_bytes()

    raw_msg = email.message_from_bytes(raw_bytes)
    real_from = str(raw_msg.get("From", ""))
    real_reply_to = str(raw_msg.get("Reply-To", ""))
    real_subject = str(raw_msg.get("Subject", ""))
    real_date = str(raw_msg.get("Date", ""))
    real_received = raw_msg.get_all("Received", [])

    service = CaseService()
    result = service.analyze_email(raw_bytes=raw_bytes, filename=file_path.name)

    # 1. Confirm envelope fields match the actual .eml content
    assert result.parsed_email.from_address == real_from.strip()
    assert result.parsed_email.reply_to == real_reply_to.strip()
    assert result.parsed_email.subject == real_subject.strip()
    assert result.parsed_email.date in real_date or real_date in result.parsed_email.date
    assert len(result.received_hops) == len(real_received)

    # 2. Confirm Authentication-Results parsing from the real email
    assert result.spf.status == "pass"
    assert result.spf.passed is True
    assert result.dkim.status == "pass"
    assert result.dkim.passed is True
    assert result.dmarc.status == "pass"
    assert result.dmarc.passed is True

    # 3. Confirm Received hops are extracted dynamically
    assert len(result.received_hops) > 0
    for hop in result.received_hops:
        assert hop.from_ip is not None
        assert hop.from_host is not None
        assert hop.raw_header is not None

    # 4. Confirm no hardcoded spoofed values
    assert "microsoft" not in result.parsed_email.from_domain.lower()

    # 5. Confirm assessment summary and confidence basis
    assert "Multiple authentication and routing signals support the claimed sender identity" in result.assessment_summary
    assert "No single authentication check proves legitimacy" in result.confidence_basis

    # 6. Overall forensic risk score (non-zero floor of 5-10, LOW RISK)
    assert 5 <= result.risk_score <= 24
    assert result.severity == "LOW"

    # 7. Every score contribution must be visible in findings
    assert any("Baseline forensic risk" in f for f in result.findings)
    assert any("Reply-To" in f or "Contextual" in f for f in result.findings)

    # 8. Geolocation verification (public IP 159.183.103.179)
    assert result.geolocation is not None
    assert result.geolocation.is_public is True
    assert result.geolocation.status == "success"
    assert result.geolocation.latitude is not None
    assert result.geolocation.longitude is not None
    assert "San Francisco" in (result.geolocation.city or "")
