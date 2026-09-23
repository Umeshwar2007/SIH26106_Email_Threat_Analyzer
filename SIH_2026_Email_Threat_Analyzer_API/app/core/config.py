import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
EVIDENCE_STORE_PATH = Path(os.getenv("EVIDENCE_STORE_PATH", BASE_DIR / "evidence_store"))
DNS_TIMEOUT_SECONDS = float(os.getenv("DNS_TIMEOUT_SECONDS", "5.0"))
APP_ENV = os.getenv("APP_ENV", "development")

# Ensure evidence storage directory exists
EVIDENCE_STORE_PATH.mkdir(parents=True, exist_ok=True)

# CORS configurations
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
