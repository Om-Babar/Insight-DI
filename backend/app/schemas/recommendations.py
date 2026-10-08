from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# ── Prescriptive Recommendation Schemas ──────────────────────────────

class RecommendationItem(BaseModel):
    id: str
    title: str
    category: str = Field(..., description="pricing, marketing, inventory, operations, customer")
    priority: str = Field(..., description="critical, high, medium, low")
    action: str = Field(..., description="Concrete actionable recommendation")
    expected_outcome: str = Field(..., description="Projected positive impact on revenue/margins/inventory")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Model confidence in recommendation")
    supporting_evidence: List[str] = Field(..., description="Empirical data proof from Analytics, RCA, and Competition")
    estimated_revenue_lift_inr: float = Field(..., description="Estimated incremental revenue in INR")


class RecommendationResponse(BaseModel):
    generated_at: str
    total_recommendations: int
    top_priority_category: str
    recommendations: List[RecommendationItem]


# ── What-If Simulation Schemas ────────────────────────────────────────

class WhatIfScenarioInput(BaseModel):
    ad_spend_change_pct: float = Field(0.0, description="Percentage change in daily marketing spend (-100% to +300%)")
    price_change_pct: float = Field(0.0, description="Percentage change in catalog selling prices (-50% to +100%)")
    inventory_reorder_boost_pct: float = Field(0.0, description="Percentage increase in safety stock / reorder replenishment (0% to 200%)")
    time_horizon_days: int = Field(30, ge=7, le=90, description="Forecast horizon in days (default 30)")


class SimulatedMetric(BaseModel):
    baseline: float
    simulated: float
    absolute_change: float
    percentage_change: float


class WhatIfSimulationResponse(BaseModel):
    scenario_id: str
    simulation_date: str
    horizon_days: int
    inputs: WhatIfScenarioInput
    metrics: Dict[str, SimulatedMetric] = Field(
        ...,
        description="Simulated business outcomes: revenue, profit, unit_sales, ad_spend, roas, stockout_risk",
    )
    risk_level: str = Field(..., description="low, medium, high, severe")
    risk_assessment: str
    trade_off_analysis: str
    strategic_verdict: str
