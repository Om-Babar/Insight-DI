from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db, engine
from app.schemas.common import HealthResponse
from app.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="System Health Check")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint to verify backend service and database connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database_status=db_status,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
