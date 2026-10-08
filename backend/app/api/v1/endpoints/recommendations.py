from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.common import APIResponse
from app.schemas.recommendations import (
    RecommendationResponse,
    WhatIfScenarioInput,
    WhatIfSimulationResponse,
)
from app.services.recommendation_service import PrescriptiveEngine, WhatIfSimulator

router = APIRouter()


@router.get("/prescriptions", response_model=APIResponse[RecommendationResponse])
def get_prescriptive_recommendations(
    db: Session = Depends(get_db),
):
    """
    Generate evidence-backed prescriptive business recommendations.
    Cross-evaluates inventory stockout risks, competitor undercutting,
    marketing channel ROAS, and customer churn.
    """
    try:
        recommendations = PrescriptiveEngine.generate_recommendations(db=db)
        return APIResponse(
            success=True,
            message=f"Generated {recommendations.total_recommendations} prescriptive recommendations.",
            data=recommendations,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")


@router.post("/simulate", response_model=APIResponse[WhatIfSimulationResponse])
def simulate_what_if_scenario(
    scenario: WhatIfScenarioInput,
    db: Session = Depends(get_db),
):
    """
    Simulate hypothetical business decisions across ad-spend, pricing, and inventory buffers.
    Models price elasticity (Ped ~ -1.35), marketing diminishing returns, and stockout probability.
    """
    try:
        sim_result = WhatIfSimulator.simulate_scenario(db=db, scenario=scenario)
        return APIResponse(
            success=True,
            message="What-If simulation completed successfully.",
            data=sim_result,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
