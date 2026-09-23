from datetime import datetime
from typing import Dict, List, Optional
from app.core.ids import generate_case_id, generate_evidence_id
from app.forensics.dkim_check import check_dkim
from app.forensics.dmarc_check import check_dmarc
from app.forensics.geolocation import lookup_ip_geolocation
from app.forensics.header_anomalies import HeaderAnomalyDetector
from app.forensics.received_chain import ReceivedChainAnalyzer
from app.forensics.spf_check import check_spf
from app.ingestion.evidence_store import EvidenceStore
from app.ingestion.mime_parser import MimeParser
from app.models import AnalysisResult

class CaseService:
    def __init__(self, evidence_store: Optional[EvidenceStore] = None):
        self.evidence_store = evidence_store or EvidenceStore()
        self._cases: Dict[str, AnalysisResult] = {}

    def analyze_email(self, raw_bytes: bytes, filename: str = "uploaded.eml") -> AnalysisResult:
        """
        Orchestrate the complete email forensics pipeline:
        Ingest -> Hash & Store -> Parse MIME -> Analyze Hops -> Detect Anomalies ->
        Audit SPF/DKIM/DMARC -> Deterministic Risk Scoring -> Correlated Assessment
        """
        # 1. Generate IDs
        case_id = generate_case_id()
        evidence_id = generate_evidence_id()

        # 2. Preserve original evidence
        evidence_record = self.evidence_store.save_evidence(
            raw_bytes=raw_bytes,
            filename=filename,
            case_id=case_id,
            evidence_id=evidence_id,
        )

        # 3. Parse MIME structure and headers
        parsed_email = MimeParser.parse_bytes(raw_bytes)

        # 4. Reconstruct Received chain and extract source IP
        received_hops, source_ip = ReceivedChainAnalyzer.analyze(parsed_email.received_headers)
        parsed_email.source_ip = source_ip
        geo_info = lookup_ip_geolocation(source_ip)

        # 5. Analyze header anomalies
        header_anomalies = HeaderAnomalyDetector.analyze(parsed_email, received_hops)

        # 6. Run SPF check
        spf_res = check_spf(
            source_ip=source_ip,
            sender_domain=parsed_email.from_domain,
            mail_from=parsed_email.from_address,
            raw_headers=parsed_email.raw_headers,
        )

        # 7. Run DKIM check
        dkim_res = check_dkim(
            raw_bytes=raw_bytes,
            raw_headers=parsed_email.raw_headers,
            sender_domain=parsed_email.from_domain,
        )

        # 8. Run DMARC check
        dmarc_res = check_dmarc(
            sender_domain=parsed_email.from_domain,
            spf_result=spf_res,
            dkim_result=dkim_res,
            raw_headers=parsed_email.raw_headers,
        )

        # 9. Deterministic Forensic Risk Scoring
        # PRINCIPLE: Risk score represents "forensic suspicion", NOT "probability that the email is fake".
        # Even fully authenticated emails retain a small baseline residual suspicion (min floor 5)
        # because authentication protocols alone do not guarantee innocence.
        risk_score = 10
        findings: List[str] = [
            "Baseline forensic risk: 10 (A forensic analyzer does not assume absolute 0% risk based solely on headers)."
        ]

        auth_failures = 0
        auth_passes = 0

        # SPF Evaluation
        if spf_res.status == "fail":
            risk_score += 25
            auth_failures += 1
            findings.append("SPF validation failed (+25 risk): Source IP is not authorized by the sender's published policy.")
        elif spf_res.status == "pass":
            risk_score -= 3
            auth_passes += 1
            findings.append("SPF check passed (-3 risk): Source IP is authorized by sender domain policy.")
        else:
            findings.append(f"SPF status is {spf_res.status} (0 risk adjustment).")

        # DKIM Evaluation
        if dkim_res.status == "fail":
            risk_score += 30
            auth_failures += 1
            findings.append("DKIM verification failed (+30 risk): Cryptographic signature mismatch indicating alteration.")
        elif dkim_res.status == "pass":
            risk_score -= 3
            auth_passes += 1
            findings.append("DKIM check passed (-3 risk): Cryptographic body and header signature verified.")
        else:
            findings.append(f"DKIM status is {dkim_res.status} (0 risk adjustment).")

        # DMARC Evaluation
        if dmarc_res.status == "fail":
            risk_score += 25
            auth_failures += 1
            findings.append("DMARC alignment failed (+25 risk): Neither SPF nor DKIM aligns with the From domain.")
        elif dmarc_res.status == "pass":
            risk_score -= 3
            auth_passes += 1
            findings.append("DMARC check passed (-3 risk): Authentication aligns with From domain policy.")
        else:
            findings.append(f"DMARC status is {dmarc_res.status} (0 risk adjustment).")

        # Header Anomalies Evaluation
        for anomaly in header_anomalies:
            if anomaly.severity == "CRITICAL":
                risk_score += 35
                findings.append(f"CRITICAL (+35 risk): {anomaly.description}")
            elif anomaly.severity == "HIGH":
                risk_score += 25
                findings.append(f"HIGH (+25 risk): {anomaly.description}")
            elif anomaly.severity == "MEDIUM":
                risk_score += 15
                findings.append(f"MEDIUM (+15 risk): {anomaly.description}")
            elif anomaly.severity == "LOW":
                risk_score += 8
                findings.append(f"LOW (+8 risk): {anomaly.description}")
            elif anomaly.type in ("REPLY_TO_SUBDOMAIN_VARIANCE", "REPLY_TO_ADDRESS_VARIANCE"):
                risk_score += 5
                findings.append(f"Contextual variance (+5 risk): {anomaly.description}")
            else:
                findings.append(f"INFO (0 risk adjustment): {anomaly.description}")

        # Enforce non-absolute forensic bounds [5, 100]
        # Prevents declaring absolute 0 risk on any email
        risk_score = max(5, min(100, risk_score))

        # Severity Classification
        if risk_score <= 24:
            severity = "LOW"
        elif risk_score <= 49:
            severity = "MEDIUM"
        elif risk_score <= 74:
            severity = "HIGH"
        else:
            severity = "CRITICAL"

        # 10. Multi-Signal Correlated Forensic Assessment
        confidence_basis = (
            "No single authentication check proves legitimacy. "
            "This assessment correlates authentication, sender identity, routing information and header signals."
        )

        has_high_anomalies = any(a.severity in ("HIGH", "CRITICAL") for a in header_anomalies)

        if auth_failures > 0 or has_high_anomalies:
            assessment_summary = (
                "Authentication and identity signals are inconsistent. "
                "Discrepancies in headers or cryptographic alignment were detected; further investigation is recommended."
            )
        elif auth_passes >= 2 and not has_high_anomalies:
            assessment_summary = (
                "Multiple authentication and routing signals support the claimed sender identity, "
                "with no major contradictory forensic indicators detected."
            )
        elif spf_res.status == "not_checked" and dkim_res.status == "not_checked":
            assessment_summary = (
                "Insufficient authentication or routing evidence was available to make a strong assessment."
            )
        else:
            assessment_summary = (
                "Authentication and routing signals provide neutral correlation. "
                "No critical anomalies detected, but further contextual review is advised."
            )

        analyzed_at = datetime.utcnow().isoformat() + "Z"

        result = AnalysisResult(
            case_id=case_id,
            evidence=evidence_record,
            parsed_email=parsed_email,
            received_hops=received_hops,
            header_anomalies=header_anomalies,
            spf=spf_res,
            dkim=dkim_res,
            dmarc=dmarc_res,
            risk_score=risk_score,
            severity=severity,
            findings=findings,
            assessment_summary=assessment_summary,
            confidence_basis=confidence_basis,
            analyzed_at=analyzed_at,
            geolocation=geo_info,
        )

        self._cases[case_id] = result
        return result

    def get_case(self, case_id: str) -> Optional[AnalysisResult]:
        """Retrieve an existing case result."""
        return self._cases.get(case_id)

    def list_cases(self, limit: int = 50) -> List[AnalysisResult]:
        """Return recent analyzed cases up to limit."""
        cases = list(self._cases.values())
        return list(reversed(cases))[:limit]

case_service = CaseService()
