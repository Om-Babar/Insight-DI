from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.session import get_db
from app.schemas.common import APIResponse
from app.schemas.datasources import (
    FileUploadResponse,
    ColumnMappingItem,
    ColumnMappingUpdateRequest,
    DataQualityReport,
    ProcessUploadRequest,
    ProcessUploadResponse,
    UploadHistoryItem,
)
from app.models.upload import UploadMetadata
from app.services.datasource_service import DataSourceService

router = APIRouter()


@router.post("/upload", response_model=APIResponse[FileUploadResponse], summary="Upload business data file for automated profiling")
async def upload_file(
    file: UploadFile = File(...), db: Session = Depends(get_db)
):
    """
    Accepts CSV, Excel (.xlsx/.xls), or JSON.
    Automatically profiles data, classifies dataset type, and generates initial schema mappings.
    """
    contents = await file.read()
    try:
        profile_res = DataSourceService.upload_and_profile_file(
            db, filename=file.filename, file_bytes=contents
        )
        return APIResponse(
            success=True,
            message=f"File '{file.filename}' uploaded and analyzed successfully. Detected type: {profile_res.detected_type}.",
            data=profile_res,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process uploaded file: {str(e)}",
        )


@router.get("/{upload_id}/mapping", response_model=APIResponse[List[ColumnMappingItem]], summary="Get column mappings for uploaded dataset")
def get_column_mappings(upload_id: int, db: Session = Depends(get_db)):
    """Retrieve the current proposed column mappings for a specific upload."""
    mappings = DataSourceService.get_mappings(db, upload_id)
    if not mappings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No mappings found for upload ID {upload_id}.",
        )
    return APIResponse(
        success=True,
        message="Column mappings retrieved successfully.",
        data=mappings,
    )


@router.put("/{upload_id}/mapping", response_model=APIResponse[List[ColumnMappingItem]], summary="Update and confirm column mappings")
def update_column_mappings(
    upload_id: int,
    payload: ColumnMappingUpdateRequest,
    db: Session = Depends(get_db),
):
    """Allow user to review, edit, and confirm column mappings before ingestion."""
    updated = DataSourceService.update_mappings(db, upload_id, payload.mappings)
    return APIResponse(
        success=True,
        message="Column mappings updated and confirmed successfully.",
        data=updated,
    )


@router.get("/{upload_id}/quality-report", response_model=APIResponse[DataQualityReport], summary="Get data quality scorecard & validation issues")
def get_quality_report(upload_id: int, db: Session = Depends(get_db)):
    """Run data quality and validation gates, generating score (0-100) and issue breakdown."""
    try:
        report = DataSourceService.generate_quality_report(db, upload_id)
        return APIResponse(
            success=True,
            message=f"Quality report generated successfully. Score: {report.overall_score}/100.",
            data=report,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to generate quality report: {str(e)}",
        )


@router.post("/{upload_id}/process", response_model=APIResponse[ProcessUploadResponse], summary="Clean and ingest dataset into canonical schema")
def process_and_ingest(
    upload_id: int,
    payload: ProcessUploadRequest,
    db: Session = Depends(get_db),
):
    """Apply approved data cleaning operations and store standardized records in PostgreSQL."""
    try:
        result = DataSourceService.process_and_ingest(
            db,
            upload_id=upload_id,
            apply_imputation=payload.apply_imputation,
            drop_duplicates=payload.drop_duplicates,
            standardize_dates=payload.standardize_dates,
        )
        return APIResponse(
            success=True,
            message=result.message,
            data=result,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process and ingest data: {str(e)}",
        )


@router.get("/history", response_model=APIResponse[List[UploadHistoryItem]], summary="Get history of all uploaded data sources")
def get_upload_history(db: Session = Depends(get_db)):
    """List all previously uploaded datasets with their processing status and quality scores."""
    records = db.query(UploadMetadata).order_by(desc(UploadMetadata.uploaded_at)).all()
    return APIResponse(
        success=True,
        message="Upload history retrieved successfully.",
        data=[UploadHistoryItem.model_validate(r) for r in records],
    )
