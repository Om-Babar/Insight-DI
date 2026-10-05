from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.common import APIResponse
from app.schemas.forecast import (
    CustomerSegmentationResponse,
    RevenueForecastRequest,
    RevenueForecastResponse,
    ModelBenchmarkComparison,
)
from app.services.forecast_service import ForecastService

router = APIRouter()


@router.get("/segmentation", response_model=APIResponse[CustomerSegmentationResponse], summary="Customer behavioral cohorts (K-Means)")
def get_customer_segmentation(
    k: int = Query(4, ge=2, le=8), db: Session = Depends(get_db)
):
    """Run K-Means clustering on RFM features and return customer persona profiles with silhouette score."""
    result = ForecastService.run_customer_segmentation(db, k=k)
    return APIResponse(
        success=True,
        message=f"K-Means clustering completed successfully for {result.total_customers} customers. Silhouette Score: {result.silhouette_score}.",
        data=result,
    )


@router.post("/revenue", response_model=APIResponse[RevenueForecastResponse], summary="Multi-day revenue forecasting (XGBoost / Random Forest)")
def forecast_revenue(
    payload: RevenueForecastRequest, db: Session = Depends(get_db)
):
    """Generate predictive daily revenue forecast for a configurable horizon (7 to 90 days) with confidence intervals."""
    result = ForecastService.forecast_revenue(
        db, horizon_days=payload.horizon_days, model_type=payload.model_type
    )
    return APIResponse(
        success=True,
        message=f"Revenue forecast generated successfully for {payload.horizon_days} days using {result.model_name}.",
        data=result,
    )


@router.get("/timeseries", response_model=APIResponse[RevenueForecastResponse], summary="Time-series baseline forecast (ARIMA)")
def get_timeseries_forecast(
    horizon: int = Query(30, ge=7, le=90), db: Session = Depends(get_db)
):
    """Generate time-series projections using the ARIMA sequential model."""
    result = ForecastService.forecast_revenue(
        db, horizon_days=horizon, model_type="arima"
    )
    return APIResponse(
        success=True,
        message=f"ARIMA time-series forecast generated for {horizon} days.",
        data=result,
    )


@router.get("/benchmarks", response_model=APIResponse[ModelBenchmarkComparison], summary="Model performance benchmark comparison")
def get_model_benchmarks(db: Session = Depends(get_db)):
    """Compare R2, MAE, and RMSE across XGBoost, Random Forest, and ARIMA models on holdout evaluation."""
    result = ForecastService.get_benchmark_comparison(db)
    return APIResponse(
        success=True,
        message=f"Model evaluation comparison completed. Recommended: {result.recommended_model}.",
        data=result,
    )
