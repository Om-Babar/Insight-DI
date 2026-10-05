from datetime import date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class CustomerSegmentCluster(BaseModel):
    cluster_id: int
    persona_name: str
    description: str
    customer_count: int
    percentage: float
    avg_recency_days: float
    avg_frequency: float
    avg_monetary_spend: float
    avg_order_value: float


class CustomerSegmentationResponse(BaseModel):
    clusters: List[CustomerSegmentCluster]
    silhouette_score: float
    total_customers: int


class ForecastPredictionPoint(BaseModel):
    date: date
    predicted_value: float
    lower_bound: float
    upper_bound: float


class ModelEvaluationMetrics(BaseModel):
    model_name: str
    target_metric: str = "daily_revenue"
    r2_score: float
    mae: float
    rmse: float
    relative_error_pct: float
    test_days: int


class RevenueForecastRequest(BaseModel):
    horizon_days: int = Field(30, ge=7, le=90)
    model_type: str = Field("xgboost", pattern="^(xgboost|random_forest|arima)$")


class RevenueForecastResponse(BaseModel):
    model_name: str
    horizon_days: int
    total_projected_revenue: float
    forecast: List[ForecastPredictionPoint]
    evaluation: ModelEvaluationMetrics
    historical_last_30_days: List[Dict[str, Any]]


class ModelBenchmarkComparison(BaseModel):
    benchmarks: List[ModelEvaluationMetrics]
    recommended_model: str
    evaluation_notes: str
