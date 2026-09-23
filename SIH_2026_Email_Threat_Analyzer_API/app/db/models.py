"""
Placeholder SQLAlchemy models for future relational database migration.
For this SIH 2026 prototype, in-memory caching and filesystem evidence storage
are used to avoid external database dependencies.
"""
from typing import Optional

try:
    from sqlalchemy import Column, DateTime, Integer, String, Text
    from sqlalchemy.orm import declarative_base

    Base = declarative_base()

    class CaseDBModel(Base):
        __tablename__ = "cases"

        id = Column(String(64), primary_key=True, index=True)
        filename = Column(String(255), nullable=False)
        sha256 = Column(String(64), nullable=False)
        sender = Column(String(255))
        recipient = Column(String(255))
        subject = Column(String(500))
        risk_score = Column(Integer, default=0)
        severity = Column(String(32), default="LOW")
        assessment_summary = Column(Text)
        created_at = Column(DateTime)
except ImportError:
    # If SQLAlchemy is not installed in the current environment
    Base = None
    CaseDBModel = None
