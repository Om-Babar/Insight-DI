from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    health,
    overview,
    entities,
    datasources,
    analytics,
    forecast,
    competitors,
    rca,
    recommendations,
    chatbot,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(overview.router, prefix="/overview", tags=["Overview Dashboard"])
api_router.include_router(entities.router, prefix="/entities", tags=["Warehouse Entities"])
api_router.include_router(datasources.router, prefix="/datasources", tags=["Data Sources"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Business Analytics"])
api_router.include_router(forecast.router, prefix="/forecast", tags=["Predictive Analytics & Forecasting"])
api_router.include_router(competitors.router, prefix="/competitors", tags=["Competitive Intelligence"])
api_router.include_router(rca.router, prefix="/rca", tags=["Root Cause Analysis & Explainable AI (SHAP)"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["Prescriptive Recommendations & What-If Simulation"])
api_router.include_router(chatbot.router, prefix="/chatbot", tags=["AI Business Chatbot & Reports"])
