from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, DateTime, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class UploadMetadata(Base):
    __tablename__ = "upload_metadata"

    upload_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)  # csv, xlsx, json
    detected_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # SALES, INVENTORY, etc.
    detection_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(50), default="UPLOADED")  # UPLOADED, MAPPED, VALIDATED, PROCESSED, ERROR
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    column_count: Mapped[int] = mapped_column(Integer, default=0)
    quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    file_profile: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    quality_report: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class SchemaMapping(Base):
    __tablename__ = "schema_mappings"

    mapping_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    upload_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    source_column: Mapped[str] = mapped_column(String(100), nullable=False)
    canonical_column: Mapped[str] = mapped_column(String(100), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    is_confirmed: Mapped[bool] = mapped_column(default=True)
