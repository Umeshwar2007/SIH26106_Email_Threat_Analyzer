import ipaddress
import json
import urllib.request
from typing import Dict, Optional
from app.models import GeoLocationInfo

_KNOWN_DEMO_GEO: Dict[str, dict] = {
    "159.183.103.179": {
        "latitude": 37.7879,
        "longitude": -122.392,
        "city": "San Francisco",
        "region": "California",
        "country": "United States",
        "isp": "SendGrid, Inc.",
        "asn": "AS11377 SendGrid, Inc.",
    },
    "209.85.220.41": {
        "latitude": 37.3861,
        "longitude": -122.084,
        "city": "Mountain View",
        "region": "California",
        "country": "United States",
        "isp": "Google LLC",
        "asn": "AS15169 Google LLC",
    },
    "108.174.3.197": {
        "latitude": 39.0438,
        "longitude": -77.4874,
        "city": "Ashburn",
        "region": "Virginia",
        "country": "United States",
        "isp": "LinkedIn Corporation",
        "asn": "AS55163 LinkedIn Corporation",
    },
}

_GEO_CACHE: Dict[str, GeoLocationInfo] = {}

def is_public_ip(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        return ip.is_global and not (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_unspecified
            or ip.is_multicast
        )
    except ValueError:
        return False

def lookup_ip_geolocation(ip_str: str) -> GeoLocationInfo:
    if not is_public_ip(ip_str):
        return GeoLocationInfo(
            ip=ip_str,
            is_public=False,
            status="private",
            city="Local / Private IP",
            country="Reserved Address Space",
        )

    if ip_str in _GEO_CACHE:
        return _GEO_CACHE[ip_str]

    if ip_str in _KNOWN_DEMO_GEO:
        d = _KNOWN_DEMO_GEO[ip_str]
        info = GeoLocationInfo(
            ip=ip_str,
            is_public=True,
            status="success",
            latitude=d["latitude"],
            longitude=d["longitude"],
            city=d["city"],
            region=d["region"],
            country=d["country"],
            isp=d["isp"],
            asn=d["asn"],
        )
        _GEO_CACHE[ip_str] = info
        return info

    try:
        url = f"http://ip-api.com/json/{ip_str}?fields=status,message,country,regionName,city,lat,lon,isp,as"
        req = urllib.request.Request(url, headers={"User-Agent": "ThreatTrace/1.0"})
        with urllib.request.urlopen(req, timeout=2.0) as res:
            if res.status == 200:
                raw = json.loads(res.read().decode("utf-8"))
                if raw.get("status") == "success":
                    info = GeoLocationInfo(
                        ip=ip_str,
                        is_public=True,
                        status="success",
                        latitude=float(raw["lat"]),
                        longitude=float(raw["lon"]),
                        city=raw.get("city"),
                        region=raw.get("regionName"),
                        country=raw.get("country"),
                        isp=raw.get("isp"),
                        asn=raw.get("as"),
                    )
                    _GEO_CACHE[ip_str] = info
                    return info
    except Exception:
        pass

    fallback_info = GeoLocationInfo(
        ip=ip_str,
        is_public=True,
        status="unavailable",
    )
    _GEO_CACHE[ip_str] = fallback_info
    return fallback_info
