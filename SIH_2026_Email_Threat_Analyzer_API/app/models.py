from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class EvidenceRecord(BaseModel):
    evidence_id: str
    case_id: str
    filename: str
    sha256: str
    stored_path: str
    size_bytes: int
    created_at: str

class AttachmentInfo(BaseModel):
    filename: str
    content_type: str
    size_bytes: int
    sha256: str

class ParsedEmailSummary(BaseModel):
    subject: str = ""
    from_address: str = ""
    from_domain: str = ""
    to_addresses: List[str] = []
    reply_to: str = ""
    reply_to_domain: str = ""
    return_path: str = ""
    return_path_domain: str = ""
    message_id: str = ""
    date: str = ""
    source_ip: str = "127.0.0.1"
    body_preview: str = ""
    attachment_count: int = 0
    attachments: List[AttachmentInfo] = []
    raw_headers: str = ""
    received_headers: List[str] = []

class ReceivedHop(BaseModel):
    hop_number: int
    from_host: str
    from_ip: str
    by_host: str
    timestamp: str
    raw_header: str
    protocol: Optional[str] = None
    delay_seconds: Optional[float] = None

class HeaderAnomaly(BaseModel):
    type: str
    severity: str  # "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    description: str
    evidence: str

class AuthCheckResult(BaseModel):
    status: str  # "pass" | "fail" | "softfail" | "neutral" | "none" | "temperror" | "permerror" | "error" | "not_checked"
    passed: Optional[bool] = None
    reason: str
    domain: Optional[str] = None
    checked_at: str

class GeoLocationInfo(BaseModel):
    ip: str
    is_public: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    isp: Optional[str] = None
    asn: Optional[str] = None
    status: str = "unavailable"  # "success" | "unavailable" | "private"

class AnalysisResult(BaseModel):
    case_id: str
    evidence: EvidenceRecord
    parsed_email: ParsedEmailSummary
    received_hops: List[ReceivedHop] = []
    header_anomalies: List[HeaderAnomaly] = []
    spf: AuthCheckResult
    dkim: AuthCheckResult
    dmarc: AuthCheckResult
    risk_score: int = Field(ge=0, le=100)
    severity: str  # "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    findings: List[str] = []
    assessment_summary: str
    confidence_basis: str
    analyzed_at: str
    geolocation: Optional[GeoLocationInfo] = None
