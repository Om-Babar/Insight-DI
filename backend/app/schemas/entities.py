from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class CustomerOut(BaseModel):
    customer_id: str
    age_group: Optional[str] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    customer_segment: Optional[str] = None
    loyalty_status: Optional[str] = None
    preferred_payment_method: Optional[str] = None
    registration_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class ProductOut(BaseModel):
    product_id: str
    product_name: str
    category: str
    brand: Optional[str] = None
    cost_price: float
    selling_price: float
    current_stock: int
    reorder_level: int
    rating: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class OrderItemOut(BaseModel):
    order_item_id: str
    order_id: str
    product_id: str
    quantity: int
    unit_price: float
    cost_price: float
    discount_pct: float
    final_price: float

    model_config = ConfigDict(from_attributes=True)


class OrderOut(BaseModel):
    order_id: str
    customer_id: str
    order_date: date
    order_status: str
    channel: Optional[str] = None
    payment_method: Optional[str] = None
    promotion_id: Optional[str] = None
    total_amount: float
    refund_amount: float
    return_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class InventoryOut(BaseModel):
    inventory_id: str
    product_id: str
    date: date
    opening_stock: int
    units_sold: int
    restocked_units: int
    closing_stock: int
    stockout_flag: bool

    model_config = ConfigDict(from_attributes=True)


class CompetitorOut(BaseModel):
    competitor_id: str
    date: date
    product_id: str
    competitor_name: str
    competitor_price: float
    competitor_discount: float
    competitor_rating: Optional[float] = None
    availability: str
    competitor_url: Optional[str] = None
    review_count: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class OverviewSummaryOut(BaseModel):
    total_revenue: float
    total_orders: int
    total_customers: int
    total_products: int
    average_order_value: float
    total_marketing_spend: float
    active_stockouts: int
    total_returned_orders: int
    return_rate_pct: float
    latest_data_date: Optional[date] = None
