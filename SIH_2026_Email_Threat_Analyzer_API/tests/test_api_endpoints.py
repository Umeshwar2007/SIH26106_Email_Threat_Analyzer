from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_post_emails_and_get_case():
    sample_content = b"""From: sender@example.com
To: recipient@example.com
Subject: Test API Upload
Date: Tue, 15 Sep 2026 12:00:00 +0000
Message-ID: <test-api-01@example.com>
Received-SPF: pass client-ip=198.51.100.99;
Authentication-Results: mx.example.com; dkim=pass; dmarc=pass;
MIME-Version: 1.0
Content-Type: text/plain

This is a test upload to the FastAPI endpoint.
"""
    files = {"file": ("test_upload.eml", sample_content, "message/rfc822")}
    response = client.post("/emails", files=files)
    assert response.status_code == 201

    data = response.json()
    assert "case_id" in data
    assert data["case_id"].startswith("CASE-")
    assert data["evidence"]["sha256"] is not None
    assert data["parsed_email"]["subject"] == "Test API Upload"
    assert data["spf"]["status"] == "pass"
    assert "assessment_summary" in data
    assert "confidence_basis" in data
    assert "No single authentication check proves legitimacy" in data["confidence_basis"]
    assert "geolocation" in data
    assert data["geolocation"]["status"] == "private"
    assert data["geolocation"]["is_public"] is False
    assert data["geolocation"]["latitude"] is None

    case_id = data["case_id"]

    # Test GET /cases/{case_id}
    get_res = client.get(f"/cases/{case_id}")
    assert get_res.status_code == 200
    assert get_res.json()["case_id"] == case_id

    # Test GET /cases
    list_res = client.get("/cases")
    assert list_res.status_code == 200
    cases = list_res.json()
    assert len(cases) >= 1
    assert any(c["case_id"] == case_id for c in cases)

    # Test GET /cases/{case_id}/raw
    raw_res = client.get(f"/cases/{case_id}/raw")
    assert raw_res.status_code == 200
    assert raw_res.content == sample_content

def test_get_case_not_found():
    response = client.get("/cases/CASE-NONEXISTENT-9999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_post_invalid_file_extension():
    files = {"file": ("malicious_script.exe", b"binary data", "application/octet-stream")}
    response = client.post("/emails", files=files)
    assert response.status_code == 400
    assert "invalid file format" in response.json()["detail"].lower()
