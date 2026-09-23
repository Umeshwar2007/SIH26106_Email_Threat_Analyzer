# Email Forensics & Threat Analysis Service (SIH 2026 Prototype)

A beginner-friendly, high-performance email forensic investigation service built with Python and FastAPI. This service ingests original `.eml` email files, cryptographically preserves evidence, analyzes envelope and header authenticity (SPF, DKIM, DMARC), reconstructs mail transfer agent (MTA) relay trajectories, and generates multi-signal forensic risk assessments.

---

## 1. Project Purpose

When security operations center (SOC) analysts or incident responders receive a suspicious email, they must verify whether the email is genuine, spoofed, or part of a phishing/BEC campaign. This service automates:
- Bit-for-bit evidence preservation with cryptographic SHA-256 hashing.
- Dissection of RFC 5322 headers and multi-part MIME structures.
- Tracing Received header hops to identify the true origin IP and relay transit latency.
- Correlating authentication protocols (SPF, DKIM, DMARC) with sender identity without jumping to conclusions.

---

## 2. Architecture

```text
email-forensics-service/ (SIH_2026_Email_Threat_Analyzer_API)
│
├── app/
│   ├── main.py                  # FastAPI web application & REST routes
│   ├── models.py                # Pydantic schemas (AnalysisResult, EvidenceRecord, etc.)
│   ├── core/
│   │   ├── config.py            # Environment variables & settings
│   │   └── ids.py               # CASE-YYYYMMDD and EVD-XXXXXXXX generator
│   ├── ingestion/               # M01 Ingestion
│   │   ├── evidence_store.py    # Byte preservation & SHA-256 hashing
│   │   └── mime_parser.py       # RFC 5322 MIME & header parsing
│   ├── forensics/               # M03 Forensics
│   │   ├── received_chain.py    # Relay hop trajectory & latency analysis
│   │   ├── header_anomalies.py  # Reply-To, Return-Path & lookalike checks
│   │   ├── spf_check.py         # SPF analysis with upstream MX correlation
│   │   ├── dkim_check.py        # DKIM signature & hash verification
│   │   └── dmarc_check.py       # DMARC alignment & policy checks
│   ├── services/
│   │   └── case_service.py      # Orchestrator: ingest → parse → forensics → risk
│   └── db/
│       └── models.py            # Future SQLAlchemy database models
│
├── evidence_store/              # Immutable storage for original .eml files
├── sample_emails/               # Fixtures for testing & verification
├── tests/                       # Pytest automated test suite
├── requirements.txt
├── .env.example
├── README.md
└── Dockerfile
```

---

## 3. Installation & Prerequisites

- Python 3.10 or 3.11 installed on your machine.
- Terminal / command line access (PowerShell, Bash, or Command Prompt).

---

## 4. Virtual Environment Setup

Create and activate an isolated virtual environment:

### On Windows:
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### On Linux / macOS:
```bash
python3 -m venv venv
source venv/bin/activate
```

---

## 5. Dependency Installation

Install all required dependencies:
```bash
pip install -r requirements.txt
```

---

## 6. Running FastAPI

Start the backend API server with hot reloading enabled:
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at:
- **Service Root**: `http://127.0.0.1:8000`
- **Interactive OpenAPI Docs**: `http://127.0.0.1:8000/docs`
- **Alternative ReDoc**: `http://127.0.0.1:8000/redoc`

---

## 7. API Endpoints

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `GET` | `/health` | Health check probe | `200 OK` |
| `POST` | `/emails` | Upload & analyze an `.eml` artifact | `201 Created` |
| `GET` | `/cases` | List recent analyzed cases (`?limit=50`) | `200 OK` |
| `GET` | `/cases/{case_id}` | Retrieve complete forensic report for a case | `200 OK` / `404` |
| `GET` | `/cases/{case_id}/raw` | Download preserved original `.eml` evidence | `200 OK` / `404` |

---

## 8. Upload Example

Using `curl` from your terminal:
```bash
curl -X POST "http://127.0.0.1:8000/emails" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sample_emails/internshala.eml"
```

Using Python:
```python
import requests

with open("sample_emails/internshala.eml", "rb") as f:
    response = requests.post("http://127.0.0.1:8000/emails", files={"file": f})
    print(response.json())
```

---

## 9. Evidence Preservation

Every uploaded email is stored unmodified into the vault directory:
```text
evidence_store/<case_id>/<evidence_id>/original.eml
```
This guarantees an unbroken chain of custody. The raw payload is never mutated or re-encoded, enabling courtroom-admissible digital evidence handling.

---

## 10. SHA-256 Explanation

A SHA-256 cryptographic hash function generates a unique 256-bit (64 hexadecimal character) fingerprint from the email's raw bytes:
$$\text{hash} = \text{SHA256}(\text{original\_bytes})$$
If even a single character in the headers or body is modified, the hash changes completely (avalanche effect). This proves that the artifact inspected in the SOC matches the evidence on disk.

---

## 11. SPF, DKIM, and DMARC Explanation

1. **SPF (Sender Policy Framework)**: Checks whether the sending mail server IP is authorized by the domain owner in their published DNS TXT record (`v=spf1`).
2. **DKIM (DomainKeys Identified Mail)**: Verifies a cryptographic digital signature added by the sender's mail server against their public key published in DNS (`v=DKIM1`).
3. **DMARC (Domain-based Message Authentication, Reporting, and Conformance)**: Enforces alignment between the visible header `From:` domain and the domains validated by SPF or DKIM.

---

## 12. Received Hops Explanation

As an email travels across the internet, each Mail Transfer Agent (MTA) prepends a `Received:` header.
- The **bottom** header was added by the first sending relay (closest to sender).
- The **top** header was added by the final destination mail server (e.g., Google MX).
The analyzer sequences these hops in chronological order (hop 1 = origin), extracts IP addresses, hostnames, timestamps, and calculates transit delay between servers to spot anomalous routing or delays.

---

## 13. Risk Scoring Explanation

The risk score is a deterministic (rule-based, non-AI) calculation bounded between 0 and 100:
- **0–24 (LOW RISK)**: Cryptographic authentication aligned, consistent routing, no major anomalies.
- **25–49 (MEDIUM RISK)**: Minor discrepancies such as Reply-To domain divergence or unaligned Return-Path.
- **50–74 (HIGH RISK)**: Failed SPF/DKIM authentication or suspicious domain mimicry.
- **75–100 (CRITICAL RISK)**: Hard authentication failures combined with brand lookalike typo-squatting or malicious indicators.

---

## 14. Important Limitation

> [!IMPORTANT]
> **The analyzer does not prove legitimacy from a single authentication result.**
> 
> A passing SPF or DKIM check merely proves that a specific server was permitted to send an email, or that a body was signed by a specific domain. Attackers can register their own domain and configure perfect SPF/DKIM records.
> 
> Therefore, legitimacy is determined by **correlating multiple forensic signals** (authentication, sender identity, routing trajectory, and header context). A different Reply-To address is treated as an informative signal requiring context, not automatic proof of phishing.
