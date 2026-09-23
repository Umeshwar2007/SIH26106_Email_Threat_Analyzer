import email
import email.policy
import hashlib
import re
from typing import List, Tuple
from app.models import AttachmentInfo, ParsedEmailSummary

def extract_domain_from_address(addr_str: str) -> str:
    """Extract domain from an RFC 5322 address string like 'Name <user@domain.com>'."""
    if not addr_str:
        return ""
    match = re.search(r'<([^>]+)>', addr_str)
    raw = match.group(1).strip() if match else addr_str.strip()
    if "@" in raw:
        return raw.split("@")[-1].strip().lower()
    return ""

def parse_address_list(header_val: str) -> List[str]:
    """Parse comma-separated address list into clean strings."""
    if not header_val:
        return []
    addresses = []
    for item in header_val.split(","):
        cleaned = item.strip()
        if cleaned:
            addresses.append(cleaned)
    return addresses

class MimeParser:
    @staticmethod
    def parse_bytes(raw_bytes: bytes) -> ParsedEmailSummary:
        """
        Parse raw .eml bytes into structured ParsedEmailSummary using Python standard library email.
        Handles malformed headers and corrupted boundaries gracefully.
        """
        try:
            msg = email.message_from_bytes(raw_bytes, policy=email.policy.default)
        except Exception:
            # Fallback to compat32 policy if default policy encounters parsing issues
            msg = email.message_from_bytes(raw_bytes, policy=email.policy.compat32)

        subject = str(msg.get("Subject", "(No Subject)")).strip()
        from_raw = str(msg.get("From", "")).strip()
        from_domain = extract_domain_from_address(from_raw)

        to_raw = str(msg.get("To", "")).strip()
        to_addresses = parse_address_list(to_raw)

        reply_to = str(msg.get("Reply-To", "")).strip()
        reply_to_domain = extract_domain_from_address(reply_to)

        return_path = str(msg.get("Return-Path", "")).strip()
        return_path_domain = extract_domain_from_address(return_path)

        message_id = str(msg.get("Message-ID", "")).strip()
        date_str = str(msg.get("Date", "")).strip()

        # Collect raw headers
        header_lines = []
        try:
            for k, v in msg.raw_items():
                header_lines.append(f"{k}: {v}")
        except Exception:
            for k in msg.keys():
                header_lines.append(f"{k}: {msg.get(k)}")
        raw_headers = "\n".join(header_lines)

        # Collect Received headers preserving order
        received_headers: List[str] = []
        try:
            for k, v in msg.raw_items():
                if k.lower() == "received":
                    received_headers.append(str(v))
        except Exception:
            for val in msg.get_all("Received", []):
                received_headers.append(str(val))

        # Extract body text and attachments
        body_parts: List[str] = []
        attachments: List[AttachmentInfo] = []

        if msg.is_multipart():
            for part in msg.walk():
                content_disposition = str(part.get("Content-Disposition", ""))
                content_type = part.get_content_type()
                filename = part.get_filename()

                if filename or "attachment" in content_disposition:
                    try:
                        payload = part.get_payload(decode=True) or b""
                        h = hashlib.sha256(payload).hexdigest()
                        att_name = filename or "unnamed_attachment"
                        attachments.append(
                            AttachmentInfo(
                                filename=att_name,
                                content_type=content_type or "application/octet-stream",
                                size_bytes=len(payload),
                                sha256=h,
                            )
                        )
                    except Exception:
                        pass
                elif content_type in ("text/plain", "text/html"):
                    try:
                        content = part.get_content()
                        if isinstance(content, str):
                            body_parts.append(content)
                    except Exception:
                        try:
                            payload = part.get_payload(decode=True)
                            if payload:
                                body_parts.append(payload.decode(errors="replace"))
                        except Exception:
                            pass
        else:
            try:
                content = msg.get_content()
                if isinstance(content, str):
                    body_parts.append(content)
            except Exception:
                try:
                    payload = msg.get_payload(decode=True)
                    if payload:
                        body_parts.append(payload.decode(errors="replace"))
                except Exception:
                    pass

        body_full = "\n".join(body_parts).strip()
        body_preview = body_full[:500] if body_full else "(No readable text body extracted)"

        return ParsedEmailSummary(
            subject=subject,
            from_address=from_raw,
            from_domain=from_domain,
            to_addresses=to_addresses,
            reply_to=reply_to,
            reply_to_domain=reply_to_domain,
            return_path=return_path,
            return_path_domain=return_path_domain,
            message_id=message_id,
            date=date_str,
            source_ip="127.0.0.1",  # Populated after Received chain analysis
            body_preview=body_preview,
            attachment_count=len(attachments),
            attachments=attachments,
            raw_headers=raw_headers,
            received_headers=received_headers,
        )
