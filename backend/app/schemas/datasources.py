from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class ColumnMappingItem(BaseModel):
    source_column: str
    canonical_column: Optional[str] = None
    confidence: float
    is_confirmed: bool = True


class ColumnMappingUpdateRequest(BaseModel):
    mappings: List[ColumnMappingItem]


class FileUploadResponse(BaseModel):
    upload_id: int
    filename: str
    file_type: str
    detected_type: str
    detection_confidence: float
    row_count: int
    column_count: int
    detected_columns: List[str]
    sample_records: List[Dict[str, Any]]
    suggested_mappings: List[ColumnMappingItem]


class DataQualityIssue(BaseModel):
    field: str
    issue_type: str  # missing_values, duplicates, invalid_value, broken_fk, invalid_date
    severity: str  # CRITICAL, WARNING, INFO
    description: str
    impacted_rows: int
    impacted_percentage: float
    suggested_action: str


class DataQualityReport(BaseModel):
    upload_id: int
    filename: str
    detected_type: str
    overall_score: float  # 0 to 100
    status: str  # CLEAN, NEEDS_CLEANING, CRITICAL_ISSUES
    total_rows: int
    total_columns: int
    missing_values_count: int
    duplicate_records_count: int
    issues: List[DataQualityIssue]
    suggested_actions: List[str]


class ProcessUploadRequest(BaseModel):
    apply_imputation: bool = True
    drop_duplicates: bool = True
    standardize_dates: bool = True


class ProcessUploadResponse(BaseModel):
    upload_id: int
    status: str
    target_table: str
    rows_ingested: int
    message: str


class UploadHistoryItem(BaseModel):
    upload_id: int
    filename: str
    file_type: str
    detected_type: Optional[str] = None
    status: str
    row_count: int
    column_count: int
    quality_score: Optional[float] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)
