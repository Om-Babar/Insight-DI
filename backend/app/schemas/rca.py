from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# ── Legacy Algorithmic RCA Schemas (Preserved for compatibility) ───────

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


# ── Comprehensive Business-First RCA Schemas ──────────────────────────

class InvestigationControls(BaseModel):
    metric: str
    metric_label: str
    period: str
    start_date: str
    end_date: str
    comparison_period: str
    comparison_start_date: str
    comparison_end_date: str
    filter_product_id: Optional[str] = None
    filter_category: Optional[str] = None
    filter_channel: Optional[str] = None
    filter_segment: Optional[str] = None


class InvestigationSummary(BaseModel):
    metric_key: str
    metric_label: str
    unit: str  # "currency", "number", "percent"
    current_value: float
    previous_value: float
    absolute_change: float
    percent_change: float
    severity: str  # "critical_drop", "moderate_drop", "stable", "positive_lift", "surge"
    period_current_label: str
    period_previous_label: str
    simple_explanation: str
    investigation_scope: Optional[str] = "Store-wide Catalog" 


class FactorCard(BaseModel):
    factor_id: str
    title: str
    category: str  # "inventory", "competitive", "marketing", "pricing", "customer", "operations", "seasonality"
    observed_change: str
    evidence: str
    relationship: str  # "positive", "negative", "neutral"
    evidence_classification: str  # "measured_contribution", "statistical_association", "model_explanation", "possible_explanation"
    classification_label: str
    classification_color: str
    contribution_value: Optional[float] = None
    contribution_pct: float
    simple_explanation: str
    metric_impact_type: Optional[str] = "Relative Factor Importance"
    methodology_explanation: Optional[str] = None
    scope_note: Optional[str] = None


class WaterfallStep(BaseModel):
    name: str
    value: float
    formatted_value: str
    category: str
    is_subtotal: bool = False
    is_residual: bool = False
    note: str


class FinancialImpactBreakdown(BaseModel):
    is_additive_waterfall: bool
    title: str
    subtitle: str
    baseline_value: float
    final_value: float
    total_change: float
    steps: List[WaterfallStep]
    unexplained_residual: float
    reconciliation_verified: bool
    reconciliation_note: str


class BreakdownItem(BaseModel):
    id: str
    name: str
    secondary_info: Optional[str] = None
    current_val: float
    previous_val: float
    abs_change: float
    pct_change: float
    share_pct: float
    status: Optional[str] = None


class BusinessImpactBreakdown(BaseModel):
    by_product: List[BreakdownItem]
    by_category: List[BreakdownItem]
    by_channel: List[BreakdownItem]
    by_segment: List[BreakdownItem]


class DailyAnomalyItem(BaseModel):
    date: str
    day_name: str
    actual: float
    expected: float
    deviation_abs: float
    deviation_pct: float
    is_anomaly: bool
    severity: str  # "critical", "warning", "normal"
    flag: Optional[float] = None
    related_events_count: int = 0


class TimelineEventItem(BaseModel):
    event_id: str
    date: str
    event_type: str  # "inventory", "competitor", "marketing", "promotion", "orders"
    title: str
    description: str
    impact_level: str  # "high", "medium", "low"
    affected_entity: Optional[str] = None


class NextStepItem(BaseModel):
    step_number: int
    title: str
    action_type: str
    description: str
    link_module: str
    link_path: str
    context_params: Dict[str, Any] = Field(default_factory=dict)


class ModelBenchmarkItem(BaseModel):
    model_name: str
    r2_score: float
    mae: float
    rmse: float
    relative_error_pct: float
    benchmark_status: str


class AdvancedAnalysis(BaseModel):
    model_benchmarks: List[ModelBenchmarkItem]
    shap_features: List[FeatureImportance]
    training_sample_count: int
    training_window: str
    methodology_notes: str
    model_name: str
    r2_fit: float


class ComprehensiveRCAResponse(BaseModel):
    controls: InvestigationControls
    summary: InvestigationSummary
    factors: List[FactorCard]
    financial_impact: FinancialImpactBreakdown
    business_impact: BusinessImpactBreakdown
    unusual_activity: List[DailyAnomalyItem]
    event_timeline: List[TimelineEventItem]
    next_steps: List[NextStepItem]
    advanced_analysis: AdvancedAnalysis
    legacy: RCAResult
