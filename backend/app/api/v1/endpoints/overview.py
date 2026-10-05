from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.entities import OverviewSummaryOut
from app.schemas.common import APIResponse
from app.services.entity_service import EntityService

router = APIRouter()


@router.get("/summary", response_model=APIResponse[OverviewSummaryOut], summary="Executive summary KPIs")
def get_overview_summary(db: Session = Depends(get_db)):
    """Fetch high-level business KPIs (total revenue, orders, customers, stockouts, return rate)."""
    summary = EntityService.get_overview_summary(db)
    return APIResponse(
        success=True,
        message="Overview summary metrics calculated successfully",
        data=summary,
    )
