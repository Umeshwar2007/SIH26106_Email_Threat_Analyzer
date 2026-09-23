from app.forensics.geolocation import is_public_ip, lookup_ip_geolocation

def test_private_and_reserved_ips_are_not_public():
    private_and_reserved = [
        "127.0.0.1",
        "10.0.0.1",
        "172.16.0.1",
        "172.31.255.254",
        "192.168.1.100",
        "169.254.1.1",
        "198.51.100.25",   # RFC 5737 TEST-NET-2
        "203.0.113.88",    # RFC 5737 TEST-NET-3
        "192.0.2.1",       # RFC 5737 TEST-NET-1
        "::1",             # IPv6 Loopback
        "fc00::1",         # IPv6 Unique Local
    ]
    for ip in private_and_reserved:
        assert not is_public_ip(ip), f"IP {ip} should not be recognized as a public routable IP"

def test_public_ips_are_recognized():
    public_ips = [
        "159.183.103.179", # SendGrid
        "209.85.220.41",   # Google
        "108.174.3.197",   # LinkedIn
        "8.8.8.8",         # Google Public DNS
    ]
    for ip in public_ips:
        assert is_public_ip(ip), f"IP {ip} should be recognized as a public routable IP"

def test_geolocation_lookup_private_ip():
    geo = lookup_ip_geolocation("198.51.100.25")
    assert geo.is_public is False
    assert geo.status == "private"
    assert geo.latitude is None
    assert geo.longitude is None
    assert "Private" in (geo.city or "") or "Local" in (geo.city or "")

def test_geolocation_lookup_public_ip():
    geo = lookup_ip_geolocation("159.183.103.179")
    assert geo.is_public is True
    assert geo.status == "success"
    assert geo.latitude == 37.7879
    assert geo.longitude == -122.392
    assert geo.city == "San Francisco"
    assert "SendGrid" in (geo.isp or "")

def test_geolocation_different_ips_different_coordinates():
    geo_sg = lookup_ip_geolocation("159.183.103.179")
    geo_li = lookup_ip_geolocation("108.174.3.197")
    assert geo_sg.latitude != geo_li.latitude
    assert geo_sg.longitude != geo_li.longitude
    assert geo_sg.city != geo_li.city
