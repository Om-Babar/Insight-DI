from typing import Optional, Union
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.common import APIResponse
from app.schemas.rca import RCAResult, SHAPExplanationResponse, ComprehensiveRCAResponse
from app.services.rca_service import RCAService, TreeSHAPService

router = APIRouter()


@router.get("/diagnose", response_model=APIResponse[ComprehensiveRCAResponse])
def run_root_cause_analysis(
    metric: str = Query("revenue", description="Target KPI metric to analyze: revenue, order_count, aov, gross_profit, return_rate"),
    period: str = Query("30d", description="Analysis period: 7d, 30d, 90d, custom"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD) for custom period"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD) for custom period"),
    target_date: Optional[str] = Query(None, description="Legacy reference ISO date"),
    lookback_days: Optional[int] = Query(None, description="Legacy window size in days"),
    filter_product_id: Optional[str] = Query(None, description="Filter by product SKU/ID"),
    filter_category: Optional[str] = Query(None, description="Filter by category"),
    filter_channel: Optional[str] = Query(None, description="Filter by sales channel"),
    filter_segment: Optional[str] = Query(None, description="Filter by customer segment"),
    db: Session = Depends(get_db),
):
    """
    Execute comprehensive, business-first Root Cause Analysis (RCA).
    Evaluates:
      1. Investigation Summary (Baseline, Current, Absolute, % change, Severity)
      2. Factor cards with evidence classification (Inventory, Competition, Marketing, Discounts, Operations)
      3. Reconciled Financial Impact Waterfall & Residuals
      4. Business breakdowns (Products, Categories, Channels, Customer Segments)
      5. Statistically defensible Anomaly Detection (MAD)
      6. Verified Related Event Timeline
      7. Actionable next steps with context-preserving links
      8. Advanced ML & TreeSHAP XAI explainability
    """
    try:
        result = RCAService.run_root_cause_analysis(
            db=db,
            metric=metric,
            target_date=target_date,
            lookback_days=lookback_days or 14,
            period=period,
            start_date=start_date,
            end_date=end_date,
            filter_product_id=filter_product_id,
            filter_category=filter_category,
            filter_channel=filter_channel,
            filter_segment=filter_segment,
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
