from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.common import APIResponse
from app.schemas.analytics import (
    SalesAnalyticsResponse,
    ProductAnalyticsResponse,
    CustomerAnalyticsResponse,
    InventoryAnalyticsResponse,
    MarketingAnalyticsResponse,
    ComprehensiveKPIResponse,
)
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/sales/trends", response_model=APIResponse[SalesAnalyticsResponse], summary="Time-series sales trends & channel split")
def get_sales_trends(
    group_by: str = Query("month", pattern="^(month|day)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Aggregate historical sales by month or day with channel distributions."""
    data = AnalyticsService.get_sales_trends(
        db, group_by=group_by, start_date=start_date, end_date=end_date
    )
    return APIResponse(
        success=True,
        message="Sales trends calculated successfully",
        data=data,
    )


@router.get("/products/performance", response_model=APIResponse[ProductAnalyticsResponse], summary="Top performers, slow movers & categories")
def get_product_performance(
    limit: int = Query(10, ge=3, le=50),
    db: Session = Depends(get_db),
):
    """Analyze SKU performance, profit margins, and category revenue contributions."""
    data = AnalyticsService.get_product_performance(db, limit=limit)
    return APIResponse(
        success=True,
        message="Product performance metrics calculated successfully",
        data=data,
    )


@router.get("/customers/demographics", response_model=APIResponse[CustomerAnalyticsResponse], summary="Customer segments & geographic concentrations")
def get_customer_demographics(db: Session = Depends(get_db)):
    """Analyze customer tiers, payment method preferences, and top states/cities by spend."""
    data = AnalyticsService.get_customer_demographics(db)
    return APIResponse(
        success=True,
        message="Customer demographic insights calculated successfully",
        data=data,
    )


@router.get("/inventory/status", response_model=APIResponse[InventoryAnalyticsResponse], summary="Stock health, valuation, turnover & reorder alerts")
def get_inventory_status(db: Session = Depends(get_db)):
    """Evaluate inventory health, valuation, turnover ratio, and urgent reorder deficits."""
    data = AnalyticsService.get_inventory_status(db)
    return APIResponse(
        success=True,
        message="Inventory health and reorder alerts calculated successfully",
        data=data,
    )


@router.get("/marketing/campaigns", response_model=APIResponse[MarketingAnalyticsResponse], summary="Advertising spend, ROAS, CAC & channel efficiency")
def get_marketing_campaigns(db: Session = Depends(get_db)):
    """Evaluate digital marketing efficiency across search, social, display, and affiliate channels."""
    data = AnalyticsService.get_marketing_campaigns(db)
    return APIResponse(
        success=True,
        message="Marketing campaign analytics calculated successfully",
        data=data,
    )


@router.get("/kpis/overview", response_model=APIResponse[ComprehensiveKPIResponse], summary="Executive dashboard KPI summary cards")
def get_kpis_overview(db: Session = Depends(get_db)):
    """Fetch executive scorecards with benchmark badges and trend indicators."""
    data = AnalyticsService.get_kpis_overview(db)
    return APIResponse(
        success=True,
        message="Executive KPI overview cards calculated successfully",
        data=data,
    )
