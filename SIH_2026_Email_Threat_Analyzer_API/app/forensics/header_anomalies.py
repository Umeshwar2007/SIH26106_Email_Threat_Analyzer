import email.utils
from typing import List
from app.models import HeaderAnomaly, ParsedEmailSummary, ReceivedHop

class HeaderAnomalyDetector:
    @staticmethod
    def analyze(
        parsed: ParsedEmailSummary,
        received_hops: List[ReceivedHop],
    ) -> List[HeaderAnomaly]:
        """
        Perform deterministic header anomaly detection.
        Correlates envelope headers without jumping to ungrounded conclusions.
        """
        anomalies: List[HeaderAnomaly] = []

        # 1. From vs Reply-To relationship
        # IMPORTANT FORENSIC RULE: A different Reply-To address is NOT proof of phishing.
        # It is a contextual signal (common in campaigns, transactional emails, and ticketing).
        if parsed.reply_to and parsed.from_address:
            _, clean_reply_addr = email.utils.parseaddr(parsed.reply_to)
            _, clean_from_addr = email.utils.parseaddr(parsed.from_address)

            clean_reply_addr = clean_reply_addr.lower().strip()
            clean_from_addr = clean_from_addr.lower().strip()

            if clean_reply_addr and clean_from_addr and clean_reply_addr != clean_from_addr:
                if parsed.reply_to_domain and parsed.from_domain and parsed.reply_to_domain.lower() != parsed.from_domain.lower():
                    is_subdomain = (
                        parsed.reply_to_domain.endswith(f".{parsed.from_domain}")
                        or parsed.from_domain.endswith(f".{parsed.reply_to_domain}")
                    )
                    if not is_subdomain:
                        anomalies.append(
                            HeaderAnomaly(
                                type="REPLY_TO_MISMATCH",
                                severity="LOW",
                                description="Reply-To domain differs from From domain (requires context).",
                                evidence=f"From: {parsed.from_address} | Reply-To: {parsed.reply_to}",
                            )
                        )
                    else:
                        anomalies.append(
                            HeaderAnomaly(
                                type="REPLY_TO_SUBDOMAIN_VARIANCE",
                                severity="INFO",
                                description="Reply-To address uses an organizational root/subdomain related to the sender.",
                                evidence=f"From: {parsed.from_address} | Reply-To: {parsed.reply_to}",
                            )
                        )
                else:
                    anomalies.append(
                        HeaderAnomaly(
                            type="REPLY_TO_ADDRESS_VARIANCE",
                            severity="INFO",
                            description="Reply-To address differs from sender mailbox address within the same domain.",
                            evidence=f"From: {parsed.from_address} | Reply-To: {parsed.reply_to}",
                        )
                    )

        # 2. From vs Return-Path relationship
        if parsed.return_path_domain and parsed.from_domain:
            if parsed.return_path_domain.lower() != parsed.from_domain.lower():
                is_subdomain = (
                    parsed.return_path_domain.endswith(f".{parsed.from_domain}")
                    or parsed.from_domain.endswith(f".{parsed.return_path_domain}")
                )
                if not is_subdomain:
                    anomalies.append(
                        HeaderAnomaly(
                            type="RETURN_PATH_DIVERGENCE",
                            severity="INFO",
                            description="Return-Path envelope domain differs from header From domain (common with ESP bulk senders).",
                            evidence=f"From Domain: {parsed.from_domain} | Return-Path: {parsed.return_path}",
                        )
                    )

        # 3. Missing Message-ID header
        if not parsed.message_id:
            anomalies.append(
                HeaderAnomaly(
                    type="MISSING_MESSAGE_ID",
                    severity="MEDIUM",
                    description="The email lacks a standard RFC 5322 Message-ID header.",
                    evidence="Header 'Message-ID' is absent.",
                )
            )
        elif "@" not in parsed.message_id:
            anomalies.append(
                HeaderAnomaly(
                    type="MALFORMED_MESSAGE_ID",
                    severity="LOW",
                    description="Message-ID header does not conform to standard '<id@host>' format.",
                    evidence=f"Message-ID: {parsed.message_id}",
                )
            )

        # 4. Missing Date header
        if not parsed.date:
            anomalies.append(
                HeaderAnomaly(
                    type="MISSING_DATE_HEADER",
                    severity="LOW",
                    description="The email envelope lacks a standard RFC 5322 Date header.",
                    evidence="Header 'Date' is absent.",
                )
            )

        # 5. Unusual Received-chain condition
        if not received_hops:
            anomalies.append(
                HeaderAnomaly(
                    type="NO_RECEIVED_HOPS",
                    severity="MEDIUM",
                    description="No RFC 5322 Received headers present in the email.",
                    evidence="Zero Received headers found.",
                )
            )
        else:
            # Check for excessive inter-hop delay (> 300 seconds)
            for hop in received_hops:
                if hop.delay_seconds and hop.delay_seconds > 300:
                    anomalies.append(
                        HeaderAnomaly(
                            type="TRANSIT_DELAY_ANOMALY",
                            severity="LOW",
                            description=f"Unusual relay latency detected at hop #{hop.hop_number} ({int(hop.delay_seconds)} seconds).",
                            evidence=f"Hop {hop.hop_number} delay: {hop.delay_seconds:.1f}s",
                        )
                    )

        # 6. Lookalike / Homoglyph brand check on sender domain
        if parsed.from_domain:
            domain_lower = parsed.from_domain.lower()
            known_targets = ["microsoft", "paypal", "google", "apple", "amazon"]
            for target in known_targets:
                if target in domain_lower and domain_lower != f"{target}.com" and not domain_lower.endswith(f".{target}.com"):
                    anomalies.append(
                        HeaderAnomaly(
                            type="POTENTIAL_LOOKALIKE_DOMAIN",
                            severity="HIGH",
                            description=f"Sender domain contains keyword '{target}' but is not the authoritative domain.",
                            evidence=f"From Domain: {parsed.from_domain}",
                        )
                    )
                    break

        return anomalies
