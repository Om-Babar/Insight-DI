from typing import Optional, List, Dict, Any
from datetime import date
from pydantic import BaseModel, Field


# ── Scrape Request / Response ────────────────────────────────────

class ScrapeRequest(BaseModel):
    """Trigger a live scrape for specific products or keyword search."""
    product_ids: Optional[List[str]] = Field(
        default=None, description="Internal product IDs to match against marketplace listings."
    )
    keywords: Optional[List[str]] = Field(
        default=None, description="Free-text search keywords (e.g. 'wireless earbuds under 2000')."
    )
    platforms: List[str] = Field(
        default=["amazon", "flipkart"],
        description="Marketplaces to scrape. Supported: 'amazon', 'flipkart'.",
    )
    max_results_per_keyword: int = Field(
        default=5, ge=1, le=20, description="Max competitor items to return per keyword."
    )


class ScrapedCompetitorItem(BaseModel):
    """A single competitor product scraped from a marketplace."""
    platform: str
    product_title: str
    brand: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    discount_pct: float = 0.0
    rating: Optional[float] = None
    review_count: Optional[int] = None
    stock_status: str = "In Stock"
    product_url: str
    image_url: Optional[str] = None
    scraped_at: str


class ScrapeResponse(BaseModel):
    """Results from a live marketplace scrape."""
    platform: str
    keyword_or_product: str
    items_found: int
    results: List[ScrapedCompetitorItem]
    scrape_duration_ms: int


class FullScrapeResponse(BaseModel):
    """Aggregated scrape results across all platforms and keywords."""
    total_items_scraped: int
    platforms_scraped: List[str]
    scrape_results: List[ScrapeResponse]
    matched_to_catalog: int = 0


# ── Competitor Matching ──────────────────────────────────────────

class CompetitorMatchResult(BaseModel):
    """A matched pair between internal product and external competitor listing."""
    internal_product_id: str
    internal_product_name: str
    internal_brand: Optional[str] = None
    internal_price: float
    competitor_platform: str
    competitor_title: str
    competitor_brand: Optional[str] = None
    competitor_price: float
    competitor_discount_pct: float = 0.0
    competitor_rating: Optional[float] = None
    competitor_review_count: Optional[int] = None
    competitor_stock_status: str = "In Stock"
    competitor_url: str
    match_confidence: float = Field(ge=0.0, le=1.0)
    match_method: str  # "exact_id", "fuzzy_title", "brand_category"


# ── Price Benchmark ──────────────────────────────────────────────

class PriceBenchmarkItem(BaseModel):
    """Side-by-side price comparison for one product across platforms."""
    product_id: str
    product_name: str
    category: str
    our_price: float
    amazon_price: Optional[float] = None
    flipkart_price: Optional[float] = None
    amazon_discount_pct: Optional[float] = None
    flipkart_discount_pct: Optional[float] = None
    amazon_rating: Optional[float] = None
    flipkart_rating: Optional[float] = None
    amazon_stock: Optional[str] = None
    flipkart_stock: Optional[str] = None
    price_gap_amazon_pct: Optional[float] = Field(
        default=None, description="Positive = we're more expensive, negative = we're cheaper."
    )
    price_gap_flipkart_pct: Optional[float] = None
    competitive_position: str = Field(
        description="UNDERCUT (we're cheaper), OVERPRICED (we're pricier), COMPETITIVE (within 5%)."
    )


class PriceBenchmarkResponse(BaseModel):
    """Full benchmark matrix across all tracked products."""
    total_products_compared: int
    undercut_count: int  # products where we're cheaper
    overpriced_count: int  # products where we're more expensive
    competitive_count: int  # products within 5% of competitor
    avg_price_gap_pct: float
    benchmark_items: List[PriceBenchmarkItem]


# ── Competitor Trends ────────────────────────────────────────────

class CompetitorTrendPoint(BaseModel):
    """A single observation of a competitor's pricing on a given date."""
    date: date
    competitor_name: str
    competitor_price: float
    competitor_discount: float
    our_price: float
    price_gap_pct: float


class ProductCompetitorTrend(BaseModel):
    """Historical competitor pricing trends for one product."""
    product_id: str
    product_name: str
    our_current_price: float
    trend_data: List[CompetitorTrendPoint]
    avg_competitor_price: float
    min_competitor_price: float
    max_competitor_price: float
    price_volatility_pct: float  # std_dev / mean * 100


class CompetitorTrendsResponse(BaseModel):
    """Historical trends across multiple products and competitors."""
    total_products: int
    total_observations: int
    trends: List[ProductCompetitorTrend]


# ── Competitor Alerts ────────────────────────────────────────────

class CompetitorAlert(BaseModel):
    """Actionable alert generated from competitive intelligence."""
    alert_type: str  # "PRICE_UNDERCUT", "STOCK_OPPORTUNITY", "RATING_GAP", "NEW_DISCOUNT"
    severity: str  # "HIGH", "MEDIUM", "LOW"
    product_id: str
    product_name: str
    competitor_name: str
    platform: str
    message: str
    data: Dict[str, Any]


class CompetitorAlertsResponse(BaseModel):
    """Batch of competitive intelligence alerts."""
    total_alerts: int
    high_priority: int
    alerts: List[CompetitorAlert]
