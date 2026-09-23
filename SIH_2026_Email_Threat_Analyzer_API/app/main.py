from typing import List, Optional
from fastapi import FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.core.config import CORS_ORIGINS
from app.models import AnalysisResult
from app.services.case_service import case_service

app = FastAPI(
    title="Email Forensics & Threat Analysis Service",
    description="SIH 2026 Prototype: Multi-Signal Email Threat Detection & Header Forensics API",
    version="1.0.0",
)

# Configure CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """Health check endpoint confirming API service readiness."""
    return {"status": "ok"}

@app.post("/emails", response_model=AnalysisResult, status_code=status.HTTP_201_CREATED)
async def analyze_email_endpoint(file: UploadFile = File(...)):
    """
    Ingest, preserve, and analyze an RFC 5322 .eml email file.
    Executes MIME dissection, Received hop trajectory reconstruction,
    SPF/DKIM/DMARC auditing, header anomaly detection, and correlated forensic assessment.
    """
    filename = file.filename or "uploaded.eml"

    # Validate file extension
    valid_extensions = (".eml", ".txt", ".msg")
    if not any(filename.lower().endswith(ext) for ext in valid_extensions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a valid RFC 822 / RFC 5322 .eml file.",
        )

    content = await file.read()
    if not content or len(content.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    result = case_service.analyze_email(raw_bytes=content, filename=filename)
    return result

@app.get("/cases", response_model=List[AnalysisResult])
def list_cases_endpoint(limit: int = Query(50, ge=1, le=100)):
    """Return recently analyzed forensic cases up to the specified limit."""
    return case_service.list_cases(limit=limit)

@app.get("/cases/{case_id}", response_model=AnalysisResult)
def get_case_endpoint(case_id: str):
    """Retrieve full analysis result for a specific case by case_id."""
    case = case_service.get_case(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forensic case '{case_id}' was not found.",
        )
    return case

@app.get("/cases/{case_id}/raw")
def get_raw_email_endpoint(case_id: str):
    """Download the pristine original .eml evidence file for a given case."""
    case = case_service.get_case(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forensic case '{case_id}' was not found.",
        )

    raw_bytes = case_service.evidence_store.get_evidence(case_id=case_id)
    if not raw_bytes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence artifact not found in store.",
        )

    return Response(
        content=raw_bytes,
        media_type="message/rfc822",
        headers={"Content-Disposition": f'attachment; filename="{case.evidence.filename}"'},
    )
