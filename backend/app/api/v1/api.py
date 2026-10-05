from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    health,
    overview,
    entities,
    datasources,
    analytics,
    forecast,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(overview.router, prefix="/overview", tags=["Overview Dashboard"])
api_router.include_router(entities.router, prefix="/entities", tags=["Warehouse Entities"])
api_router.include_router(datasources.router, prefix="/datasources", tags=["Data Sources"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Business Analytics"])
api_router.include_router(forecast.router, prefix="/forecast", tags=["Predictive Analytics & Forecasting"])
