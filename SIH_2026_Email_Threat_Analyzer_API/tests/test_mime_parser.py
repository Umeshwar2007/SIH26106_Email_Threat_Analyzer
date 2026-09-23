from app.ingestion.mime_parser import MimeParser

def test_mime_parser_extraction():
    raw_email = b"""From: "Alice Smith" <alice@example.com>
To: bob@example.com, charlie@example.org
Reply-To: support@example.com
Return-Path: <bounce@example.com>
Subject: Project Delivery Schedule
Date: Tue, 15 Sep 2026 08:30:00 +0000
Message-ID: <unique-msg-id-12345@example.com>
Received: from mail.example.com ([192.0.2.1]) by mx.example.org with SMTP; Tue, 15 Sep 2026 08:31:00 +0000
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8

Dear Bob,
Please find the schedule attached.
"""
    summary = MimeParser.parse_bytes(raw_email)

    assert summary.subject == "Project Delivery Schedule"
    assert "alice@example.com" in summary.from_address
    assert summary.from_domain == "example.com"
    assert "bob@example.com" in summary.to_addresses
    assert "charlie@example.org" in summary.to_addresses
    assert summary.reply_to == "support@example.com"
    assert summary.reply_to_domain == "example.com"
    assert summary.return_path == "<bounce@example.com>"
    assert summary.return_path_domain == "example.com"
    assert summary.message_id == "<unique-msg-id-12345@example.com>"
    assert summary.date == "Tue, 15 Sep 2026 08:30:00 +0000"
    assert len(summary.received_headers) == 1
    assert "Dear Bob" in summary.body_preview

def test_mime_parser_handles_malformed_gracefully():
    # Corrupted bytes that are not a proper email
    corrupted_bytes = b"\x00\xff\xfe\x12random broken non-email data without headers"
    summary = MimeParser.parse_bytes(corrupted_bytes)
    assert summary is not None
    assert summary.subject in ("(No Subject)", "")
