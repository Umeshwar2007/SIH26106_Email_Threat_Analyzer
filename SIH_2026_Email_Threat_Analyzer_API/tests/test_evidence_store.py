import hashlib
import tempfile
from pathlib import Path
from app.ingestion.evidence_store import EvidenceStore

def test_evidence_store_preservation():
    with tempfile.TemporaryDirectory() as temp_dir:
        store = EvidenceStore(base_dir=Path(temp_dir))

        sample_bytes = b"From: sender@example.com\r\nSubject: Test Email\r\n\r\nHello Evidence Store!"
        expected_sha256 = hashlib.sha256(sample_bytes).hexdigest()

        record = store.save_evidence(
            raw_bytes=sample_bytes,
            filename="test_email.eml",
        )

        # Verify Record properties
        assert record.case_id.startswith("CASE-")
        assert record.evidence_id.startswith("EVD-")
        assert record.sha256 == expected_sha256
        assert record.size_bytes == len(sample_bytes)

        # Verify exact path structure: evidence_store/<case_id>/<evidence_id>/original.eml
        expected_path = Path(temp_dir) / record.case_id / record.evidence_id / "original.eml"
        assert Path(record.stored_path) == expected_path
        assert expected_path.exists()

        # Verify byte fidelity (original bytes unchanged)
        saved_bytes = expected_path.read_bytes()
        assert saved_bytes == sample_bytes

        # Verify retrieval via get_evidence
        retrieved_bytes = store.get_evidence(case_id=record.case_id, evidence_id=record.evidence_id)
        assert retrieved_bytes == sample_bytes
