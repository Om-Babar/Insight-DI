from datetime import date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class SalesTrendItem(BaseModel):
    period: str  # YYYY-MM or YYYY-MM-DD
    revenue: float
    orders_count: int
    average_order_value: float
    discount_total: float
    refund_total: float


class ChannelSalesItem(BaseModel):
    channel: str
    revenue: float
    orders_count: int
    share_pct: float


class SalesAnalyticsResponse(BaseModel):
    trends: List[SalesTrendItem]
    channel_breakdown: List[ChannelSalesItem]
    total_period_revenue: float
    total_period_orders: int
    growth_rate_pct: Optional[float] = None


class ProductPerformanceItem(BaseModel):
    product_id: str
    product_name: str
    category: str
    brand: Optional[str] = None
    units_sold: int
    revenue: float
    gross_profit: float
    profit_margin_pct: float
    current_stock: int
    stock_status: str  # In Stock, Low Stock, Out of Stock
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    change_pct: Optional[float] = None
    reorder_level: Optional[int] = None


class CategoryPerformanceItem(BaseModel):
    category: str
    revenue: float
    units_sold: int
    products_count: int
    avg_price: float
    share_pct: float


class ProductAnalyticsResponse(BaseModel):
    top_performers: List[ProductPerformanceItem]
    slow_movers: List[ProductPerformanceItem]
    category_breakdown: List[CategoryPerformanceItem]
    kpis: Optional[List[Dict[str, Any]]] = None
    all_products: Optional[List[ProductPerformanceItem]] = None
    trend: Optional[List[Dict[str, Any]]] = None
    trend_keys: Optional[List[Dict[str, Any]]] = None


class CustomerDemographicItem(BaseModel):
    segment_name: str
    count: int
    percentage: float


class GeographicDistributionItem(BaseModel):
    region_name: str  # State or City
    customer_count: int
    orders_count: int
    total_spend: float


class CustomerAnalyticsResponse(BaseModel):
    tier_distribution: List[CustomerDemographicItem]
    segment_distribution: List[CustomerDemographicItem]
    payment_preferences: List[CustomerDemographicItem]
    top_states: List[GeographicDistributionItem]
    top_cities: List[GeographicDistributionItem]
    
    # Enhanced fields for Business Analytics Customers section
    kpis: Optional[List[Dict[str, Any]]] = None
    trend: Optional[List[Dict[str, Any]]] = None
    trend_keys: Optional[List[Dict[str, Any]]] = None
    breakdown: Optional[List[Dict[str, Any]]] = None
    breakdown_label: Optional[str] = None
    breakdown_unit: Optional[str] = None
    table: Optional[Dict[str, Any]] = None
    geographic_performance: Optional[List[Dict[str, Any]]] = None
    segment_summary: Optional[List[Dict[str, Any]]] = None
    customer_insights: Optional[List[Dict[str, Any]]] = None


class ReorderAlertItem(BaseModel):
    product_id: str
    product_name: str
    category: str
    current_stock: int
    reorder_level: int
    deficit: int
    urgency: str  # CRITICAL, WARNING


class InventoryTableItem(BaseModel):
    product_id: str
    product_name: str
    category: str
    current_stock: int
    reorder_level: int
    avg_daily_demand: float
    days_of_cover: float
    replenishment_lead_time: Optional[str] = "Not tracked"
    risk: str  # stockout, low_stock, healthy, overstock
    suggested_action: str


class InventoryAnalyticsResponse(BaseModel):
    total_skus: int
    total_stock_units: int
    inventory_valuation: float
    healthy_stock_count: int
    low_stock_count: int
    stockout_count: int
    turnover_ratio: float
    reorder_alerts: List[ReorderAlertItem]

    # Enhanced Business Analytics fields
    kpis: Optional[List[Dict[str, Any]]] = None
    trend: Optional[List[Dict[str, Any]]] = None
    trend_keys: Optional[List[Dict[str, Any]]] = None
    breakdown: Optional[List[Dict[str, Any]]] = None
    breakdown_label: Optional[str] = None
    breakdown_unit: Optional[str] = None
    table: Optional[Dict[str, Any]] = None
    all_products: Optional[List[InventoryTableItem]] = None
    inventory_insights: Optional[List[Dict[str, Any]]] = None
    low_cover_products: Optional[List[Dict[str, Any]]] = None
    overstocked_products: Optional[List[Dict[str, Any]]] = None


class MarketingChannelItem(BaseModel):
    channel: str
    total_spend: float
    impressions: int
    clicks: int
    conversions: int
    click_through_rate_pct: float
    conversion_rate_pct: float
    cost_per_acquisition: float
    roas: float


class MarketingCampaignItem(BaseModel):
    campaign_name: str
    channel: str
    channel_category: str
    spend: float
    revenue: float
    roas: float
    impressions: int
    clicks: int
    conversions: int
    cost_per_acquisition: float
    click_through_rate_pct: float
    conversion_rate_pct: float
    status: str  # strong, moderate, attention
    recommended_action: str


class MarketingAnalyticsResponse(BaseModel):
    total_spend: float
    total_impressions: int
    total_clicks: int
    total_conversions: int
    overall_roas: float
    overall_cpa: float
    channel_performance: List[MarketingChannelItem]

    # Enhanced Business Analytics fields
    kpis: Optional[List[Dict[str, Any]]] = None
    trend: Optional[List[Dict[str, Any]]] = None
    trend_keys: Optional[List[Dict[str, Any]]] = None
    breakdown: Optional[List[Dict[str, Any]]] = None
    breakdown_label: Optional[str] = None
    breakdown_unit: Optional[str] = None
    table: Optional[Dict[str, Any]] = None
    marketing_insights: Optional[List[Dict[str, Any]]] = None
    campaign_performance: Optional[List[MarketingCampaignItem]] = None


class KPISummaryCard(BaseModel):
    kpi_key: str
    title: str
    current_value: float
    formatted_value: str
    previous_value: Optional[float] = None
    change_pct: Optional[float] = None
    trend_direction: str  # up, down, neutral
    benchmark_status: str  # healthy, attention, warning


class ComprehensiveKPIResponse(BaseModel):
    cards: List[KPISummaryCard]
    as_of_date: date
