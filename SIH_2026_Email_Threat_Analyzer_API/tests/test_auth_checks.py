from app.forensics.dkim_check import check_dkim
from app.forensics.dmarc_check import check_dmarc
from app.forensics.spf_check import check_spf
from app.services.case_service import CaseService

def test_spf_upstream_header_and_not_checked():
    # Test graceful not_checked when IP is local or unavailable
    res_unavail = check_spf(
        source_ip="127.0.0.1",
        sender_domain="example.com",
        mail_from="test@example.com",
        raw_headers="",
    )
    assert res_unavail.status == "not_checked"

    # Test upstream header verification
    headers = "Received-SPF: pass client-ip=198.51.100.10;\r\n"
    res_pass = check_spf(
        source_ip="198.51.100.10",
        sender_domain="example.com",
        mail_from="test@example.com",
        raw_headers=headers,
    )
    assert res_pass.status == "pass"
    assert res_pass.passed is True

def test_dkim_none_and_upstream_pass():
    # When no DKIM-Signature exists
    res_none = check_dkim(
        raw_bytes=b"From: a@b.com\r\nSubject: Hi\r\n\r\nBody",
        raw_headers="From: a@b.com\r\n",
        sender_domain="b.com",
    )
    assert res_none.status == "none"

    # When upstream MX verified DKIM
    headers = "DKIM-Signature: v=1;\r\nAuthentication-Results: mx.test.com; dkim=pass;\r\n"
    res_pass = check_dkim(
        raw_bytes=headers.encode(),
        raw_headers=headers,
        sender_domain="test.com",
    )
    assert res_pass.status == "pass"
    assert res_pass.passed is True

def test_dmarc_alignment_and_not_checked():
    res_spf_pass = check_spf(
        source_ip="198.51.100.1",
        sender_domain="company.com",
        mail_from="ceo@company.com",
        raw_headers="Received-SPF: pass client-ip=198.51.100.1;",
    )
    res_dkim_pass = check_dkim(
        raw_bytes=b"DKIM-Signature: ...",
        raw_headers="DKIM-Signature: ...\r\nAuthentication-Results: dkim=pass;",
        sender_domain="company.com",
    )

    dmarc_res = check_dmarc(
        sender_domain="company.com",
        spf_result=res_spf_pass,
        dkim_result=res_dkim_pass,
        raw_headers="",
    )
    assert dmarc_res.status == "pass"

def test_assessment_does_not_claim_absolute_legitimacy():
    service = CaseService()
    # Clean email with passing SPF/DKIM/DMARC
    email_bytes = b"""From: service@legit-corp.com
To: user@example.com
Subject: Account Statement
Date: Tue, 15 Sep 2026 10:00:00 +0000
Message-ID: <stmt-001@legit-corp.com>
Received-SPF: pass client-ip=198.51.100.5;
Authentication-Results: mx.example.com; dkim=pass; dmarc=pass;
DKIM-Signature: v=1; d=legit-corp.com;
Received: from mail.legit-corp.com ([198.51.100.5]) by mx.example.com with ESMTP; Tue, 15 Sep 2026 10:00:00 +0000
MIME-Version: 1.0
Content-Type: text/plain

Your monthly statement is ready.
"""
    result = service.analyze_email(raw_bytes=email_bytes, filename="statement.eml")

    # The assessment MUST NOT say "This email is definitely legitimate"
    assert "definitely legitimate" not in result.assessment_summary.lower()

    # The confidence basis MUST clearly state:
    # "No single authentication check proves legitimacy..."
    assert "No single authentication check proves legitimacy" in result.confidence_basis

    # Risk score must be bounded 0-100
    assert 0 <= result.risk_score <= 100

def test_reply_to_mismatch_not_automatically_critical_phishing():
    service = CaseService()
    # Email with different Reply-To (common in newsletters/transactional systems)
    email_bytes = b"""From: Newsletter <info@company.com>
Reply-To: feedback@service-desk.net
To: subscriber@example.com
Subject: Weekly Update
Date: Tue, 15 Sep 2026 10:00:00 +0000
Message-ID: <news-123@company.com>
Received-SPF: pass client-ip=198.51.100.1;
Authentication-Results: mx.example.com; dkim=pass; dmarc=pass;
DKIM-Signature: v=1; d=company.com;
Received: from mail.company.com ([198.51.100.1]) by mx.example.com with ESMTP; Tue, 15 Sep 2026 10:00:00 +0000
MIME-Version: 1.0
Content-Type: text/plain

Here is your weekly update.
"""
    result = service.analyze_email(raw_bytes=email_bytes, filename="newsletter.eml")

    # Reply-To mismatch must NOT cause CRITICAL severity or automatic malicious verdict
    assert result.severity != "CRITICAL"
    assert any(a.type == "REPLY_TO_MISMATCH" for a in result.header_anomalies)
    # Severity of the anomaly should be LOW, not CRITICAL
    reply_to_anomaly = next(a for a in result.header_anomalies if a.type == "REPLY_TO_MISMATCH")
    assert reply_to_anomaly.severity == "LOW"
