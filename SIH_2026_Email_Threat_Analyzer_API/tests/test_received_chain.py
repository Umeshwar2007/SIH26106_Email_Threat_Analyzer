from app.forensics.received_chain import ReceivedChainAnalyzer

def test_received_chain_ordering_and_extraction():
    # Email format: Top is newest, bottom is oldest
    headers = [
        "from relay02.corp.com ([198.51.100.2]) by mx.corp.com (Postfix) with ESMTP id 2; Tue, 15 Sep 2026 10:02:00 +0000",
        "from mail.origin-host.org ([198.51.100.1]) by relay02.corp.com (Postfix) with ESMTP id 1; Tue, 15 Sep 2026 10:00:00 +0000",
    ]

    hops, source_ip = ReceivedChainAnalyzer.analyze(headers)

    assert len(hops) == 2
    # Chronological: Hop 1 is the oldest (from origin-host.org)
    assert hops[0].hop_number == 1
    assert "origin-host.org" in hops[0].from_host
    assert hops[0].from_ip == "198.51.100.1"

    # Hop 2 is the receiving relay
    assert hops[1].hop_number == 2
    assert "relay02.corp.com" in hops[1].from_host
    assert hops[1].from_ip == "198.51.100.2"

    # Source IP should be the origin IP
    assert source_ip == "198.51.100.1"

    # Delay should be calculated (120s between 10:00:00 and 10:02:00)
    assert hops[1].delay_seconds == 120.0

def test_received_chain_handles_malformed_headers():
    malformed = ["Received: broken header without semicolons or valid hosts 12345"]
    hops, source_ip = ReceivedChainAnalyzer.analyze(malformed)
    assert len(hops) == 1
    assert hops[0].from_ip == "127.0.0.1"
    assert hops[0].raw_header == malformed[0]
