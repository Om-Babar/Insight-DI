from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.common import APIResponse
from app.schemas.rca import RCAResult, SHAPExplanationResponse
from app.services.rca_service import RCAService, TreeSHAPService

router = APIRouter()


@router.get("/diagnose", response_model=APIResponse[RCAResult])
def run_root_cause_analysis(
    metric: str = Query("daily_revenue", description="Target KPI metric to analyze (e.g. daily_revenue, order_count)"),
    target_date: Optional[str] = Query(None, description="Reference ISO date for anomaly evaluation (YYYY-MM-DD)"),
    lookback_days: int = Query(14, ge=7, le=90, description="Window size in days for anomaly comparison"),
    db: Session = Depends(get_db),
):
    """
    Execute algorithmic Root Cause Analysis (RCA) on performance drops or surges.
    Quantifies empirical contributions from:
      - Marketing ad spend changes
      - Inventory stockout rates
      - Competitor pricing undercutting
      - Order return & cancellation rates
    """
    try:
        result = RCAService.run_root_cause_analysis(
            db=db,
            metric=metric,
            target_date=target_date,
            lookback_days=lookback_days,
        )
        return APIResponse(
            success=True,
            message=f"Root cause analysis completed for {metric}.",
            data=result,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RCA evaluation failed: {str(e)}")


@router.get("/explain", response_model=APIResponse[SHAPExplanationResponse])
def get_shap_forecast_explanation(
    target_date: Optional[str] = Query(None, description="Date (YYYY-MM-DD) to generate local TreeSHAP attribution waterfall for"),
    db: Session = Depends(get_db),
):
    """
    Generate TreeSHAP explainability attributions for XGBoost revenue forecasts.
    Returns:
      - Global feature importance (mean absolute SHAP)
      - Instance waterfall contributions (positive/negative impact on predicted revenue)
      - Baseline expected value vs final prediction
    """
    try:
        explanation = TreeSHAPService.explain_xgboost_forecast(db=db, target_date=target_date)
        return APIResponse(
            success=True,
            message="TreeSHAP explanations computed successfully.",
            data=explanation,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TreeSHAP calculation failed: {str(e)}")
