import email.utils
import ipaddress
import re
from datetime import datetime
from typing import List, Optional, Tuple
from app.models import ReceivedHop

IPV4_PATTERN = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
IPV6_PATTERN = re.compile(r'\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b')

def is_public_ip(ip_str: str) -> bool:
    """Determine if an IP address is a globally routable public address."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_unspecified)
    except ValueError:
        return False

def parse_single_received_header(header_text: str, hop_index: int) -> Tuple[ReceivedHop, Optional[datetime]]:
    """
    Parse a single RFC 5322 Received header line.
    Extracts from_host, from_ip, by_host, timestamp, and preserves raw_header.
    """
    normalized = " ".join(header_text.split())

    # Date extraction (after the last semicolon)
    parsed_dt = None
    dt_str = "Unknown timestamp"
    if ";" in normalized:
        header_body, raw_date_part = normalized.rsplit(";", 1)
        raw_date_part = raw_date_part.strip()
        try:
            parsed_dt = email.utils.parsedate_to_datetime(raw_date_part)
            dt_str = parsed_dt.strftime("%Y-%m-%d %H:%M:%S UTC")
        except Exception:
            dt_str = raw_date_part[:40]
    else:
        header_body = normalized

    # IP extraction
    found_ips = IPV4_PATTERN.findall(header_body)
    from_ip = found_ips[0] if found_ips else "127.0.0.1"

    # From host extraction
    from_match = re.search(r'from\s+([^\s\(\);]+)', header_body, re.IGNORECASE)
    from_host = from_match.group(1).strip() if from_match else "unknown-origin"

    # By host extraction
    by_match = re.search(r'by\s+([^\s\(\);]+)', header_body, re.IGNORECASE)
    by_host = by_match.group(1).strip() if by_match else "unknown-receiver"

    # Protocol extraction
    with_match = re.search(r'with\s+([^\s;]+)', header_body, re.IGNORECASE)
    protocol = with_match.group(1).strip() if with_match else "SMTP"

    hop = ReceivedHop(
        hop_number=hop_index,
        from_host=from_host,
        from_ip=from_ip,
        by_host=by_host,
        timestamp=dt_str,
        raw_header=header_text.strip(),
        protocol=protocol,
    )
    return hop, parsed_dt

class ReceivedChainAnalyzer:
    @staticmethod
    def analyze(received_headers: List[str]) -> Tuple[List[ReceivedHop], str]:
        """
        Analyze Received headers in chronological relay sequence (oldest hop to newest hop).
        Returns:
            (ordered_hops, detected_source_ip)
        """
        if not received_headers:
            return [], "127.0.0.1"

        # In email format, top header is newest (recipient side), bottom header is oldest (sender side).
        # We reverse to present chronological hop sequence starting from sender.
        chronological_headers = list(reversed(received_headers))
        hops: List[ReceivedHop] = []
        dts: List[Optional[datetime]] = []

        for idx, header_line in enumerate(chronological_headers, start=1):
            hop, dt = parse_single_received_header(header_line, idx)
            hops.append(hop)
            dts.append(dt)

        # Calculate inter-hop delay where timestamps are parsable
        for i in range(1, len(hops)):
            t_prev = dts[i - 1]
            t_curr = dts[i]
            if t_prev and t_curr:
                try:
                    delta = (t_curr - t_prev).total_seconds()
                    if delta >= 0:
                        hops[i].delay_seconds = delta
                except Exception:
                    pass

        # Identify source IP: first public IP in chronological chain, or first recorded IP
        source_ip = "127.0.0.1"
        for hop in hops:
            if is_public_ip(hop.from_ip):
                source_ip = hop.from_ip
                break

        if source_ip == "127.0.0.1" and hops:
            source_ip = hops[0].from_ip

        return hops, source_ip
