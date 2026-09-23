import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional
from app.core.config import EVIDENCE_STORE_PATH
from app.core.ids import generate_case_id, generate_evidence_id
from app.models import EvidenceRecord

class EvidenceStore:
    def __init__(self, base_dir: Path = EVIDENCE_STORE_PATH):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def compute_sha256(data: bytes) -> str:
        """Calculate deterministic SHA-256 digest from original bytes."""
        return hashlib.sha256(data).hexdigest()

    def save_evidence(
        self,
        raw_bytes: bytes,
        filename: str,
        case_id: Optional[str] = None,
        evidence_id: Optional[str] = None,
    ) -> EvidenceRecord:
        """
        Preserve the original email bytes unchanged in the evidence store.
        Path format: evidence_store/<case_id>/<evidence_id>/original.eml
        """
        if not case_id:
            case_id = generate_case_id()
        if not evidence_id:
            evidence_id = generate_evidence_id()

        sha256_hash = self.compute_sha256(raw_bytes)

        target_dir = self.base_dir / case_id / evidence_id
        target_dir.mkdir(parents=True, exist_ok=True)

        target_file = target_dir / "original.eml"
        with open(target_file, "wb") as f:
            f.write(raw_bytes)

        return EvidenceRecord(
            evidence_id=evidence_id,
            case_id=case_id,
            filename=filename or "original.eml",
            sha256=sha256_hash,
            stored_path=str(target_file),
            size_bytes=len(raw_bytes),
            created_at=datetime.utcnow().isoformat() + "Z",
        )

    def get_evidence(self, case_id: str, evidence_id: Optional[str] = None) -> Optional[bytes]:
        """Retrieve stored raw email artifact bytes."""
        case_dir = self.base_dir / case_id
        if not case_dir.exists():
            return None

        if evidence_id:
            target = case_dir / evidence_id / "original.eml"
            if target.exists():
                return target.read_bytes()

        # Find first matching original.eml in case directory
        for f in case_dir.glob("**/original.eml"):
            return f.read_bytes()

        return None
