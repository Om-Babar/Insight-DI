from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# ── Algorithmic RCA Schemas ──────────────────────────────────────────

class ContributingFactor(BaseModel):
    factor_name: str = Field(..., description="Identified factor (e.g. ad_spend, stockout, competitor_undercut, return_rate)")
    category: str = Field(..., description="Category: marketing, inventory, competitive, operations, seasonality")
    correlation_score: float = Field(..., description="Correlation with anomaly/KPI drop (-1.0 to +1.0)")
    impact_pct: float = Field(..., description="Estimated percentage share of the drop/surge explained by this factor")
    direction: str = Field(..., description="'negative' (drove decrease) or 'positive' (drove increase)")
    evidence: str = Field(..., description="Fact-based empirical metric/evidence supporting this finding")


class MetricAnomaly(BaseModel):
    metric: str
    period_current: str
    period_baseline: str
    current_value: float
    baseline_value: float
    absolute_change: float
    percent_change: float
    status: str = Field(..., description="'critical_drop', 'moderate_drop', 'stable', 'surge'")


class RCAResult(BaseModel):
    analysis_id: str
    metric: str
    analysis_date: str
    anomaly: MetricAnomaly
    contributing_factors: List[ContributingFactor]
    root_cause_summary: str
    recommended_focus_area: str
    data_evidence_points: List[str]


# ── TreeSHAP XAI Schemas ─────────────────────────────────────────────

class FeatureImportance(BaseModel):
    feature: str
    mean_abs_shap: float
    direction_impact: str
    rank: int
    business_meaning: str


class WaterFallContribution(BaseModel):
    feature: str
    feature_value: float
    shap_value: float
    impact_type: str = Field(..., description="'increases_prediction' or 'decreases_prediction'")
    description: str


class SHAPExplanationResponse(BaseModel):
    model_name: str
    base_value: float = Field(..., description="Expected baseline revenue output across training set")
    prediction_value: float = Field(..., description="Model prediction for the target date/instance")
    target_date: Optional[str] = None
    global_feature_importances: List[FeatureImportance]
    waterfall_contributions: List[WaterFallContribution]
    natural_language_xai_summary: str
