import secrets
from datetime import datetime

def generate_case_id() -> str:
    """
    Generate unique case identifier.
    Format: CASE-YYYYMMDD-XXXXXXXX
    """
    date_str = datetime.utcnow().strftime("%Y%m%d")
    rand_hex = secrets.token_hex(4).upper()
    return f"CASE-{date_str}-{rand_hex}"

def generate_evidence_id() -> str:
    """
    Generate unique evidence identifier.
    Format: EVD-XXXXXXXX
    """
    rand_hex = secrets.token_hex(4).upper()
    return f"EVD-{rand_hex}"
