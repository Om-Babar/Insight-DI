from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.common import APIResponse
from app.schemas.competitors import (
    ScrapeRequest,
    FullScrapeResponse,
    PriceBenchmarkResponse,
    CompetitorTrendsResponse,
    CompetitorAlertsResponse,
)
from app.services.competitor_service import CompetitorService

router = APIRouter()


@router.post(
    "/scrape",
    response_model=APIResponse[FullScrapeResponse],
    summary="Trigger live competitor scrape (Amazon & Flipkart)",
)
def scrape_competitors(
    payload: ScrapeRequest,
    db: Session = Depends(get_db),
):
    """
    Scrape Amazon India and Flipkart for competitor product listings based on
    internal product IDs or free-text keywords. Results are automatically matched
    to the internal catalog and persisted in the competitors table.
    """
    result = CompetitorService.run_live_scrape(db, payload)
    return APIResponse(
        success=True,
        message=f"Scraped {result.total_items_scraped} items across {', '.join(result.platforms_scraped)}. "
                f"Matched {result.matched_to_catalog} items to internal catalog.",
        data=result,
    )


@router.get(
    "/benchmark",
    response_model=APIResponse[PriceBenchmarkResponse],
    summary="Price comparison benchmark matrix",
)
def get_price_benchmark(
    category: Optional[str] = Query(None, description="Filter by product category."),
    limit: int = Query(50, ge=1, le=200, description="Max products to compare."),
    db: Session = Depends(get_db),
):
    """
    Generate a side-by-side price comparison matrix between your internal catalog
    and the latest Amazon/Flipkart competitor observations. Returns competitive
    position classification (UNDERCUT / OVERPRICED / COMPETITIVE) for each product.
    """
    result = CompetitorService.get_price_benchmark(db, category=category, limit=limit)
    return APIResponse(
        success=True,
        message=f"Benchmarked {result.total_products_compared} products: "
                f"{result.undercut_count} undercut, {result.overpriced_count} overpriced, "
                f"{result.competitive_count} competitive.",
        data=result,
    )


@router.get(
    "/trends",
    response_model=APIResponse[CompetitorTrendsResponse],
    summary="Historical competitor pricing trends",
)
def get_competitor_trends(
    product_id: Optional[str] = Query(None, description="Filter by product ID."),
    competitor_name: Optional[str] = Query(None, description="Filter by competitor name."),
    limit: int = Query(20, ge=1, le=100, description="Max products to return."),
    db: Session = Depends(get_db),
):
    """
    Retrieve historical competitor pricing trends from the competitors warehouse table.
    Includes price volatility, min/max/avg competitor prices, and gap analysis over time.
    """
    result = CompetitorService.get_competitor_trends(
        db, product_id=product_id, competitor_name=competitor_name, limit=limit
    )
    return APIResponse(
        success=True,
        message=f"Retrieved {result.total_observations} observations across {result.total_products} products.",
        data=result,
    )


@router.get(
    "/alerts",
    response_model=APIResponse[CompetitorAlertsResponse],
    summary="Competitive intelligence alerts",
)
def get_competitor_alerts(db: Session = Depends(get_db)):
    """
    Generate actionable competitive intelligence alerts by analyzing latest competitor data.
    Alert types: PRICE_UNDERCUT, STOCK_OPPORTUNITY, NEW_DISCOUNT.
    """
    result = CompetitorService.generate_alerts(db)
    return APIResponse(
        success=True,
        message=f"Generated {result.total_alerts} alerts ({result.high_priority} high-priority).",
        data=result,
    )
