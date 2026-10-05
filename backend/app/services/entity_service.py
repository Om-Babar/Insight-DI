from typing import Optional, List, Tuple
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from app.models.customer import Customer
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.inventory import Inventory
from app.models.marketing import Marketing
from app.models.competitor import Competitor
from app.schemas.entities import OverviewSummaryOut


class EntityService:
    @staticmethod
    def get_overview_summary(db: Session) -> OverviewSummaryOut:
        """Calculate high-level summary KPIs from the warehouse data."""
        # Orders & Revenue aggregations
        order_stats = db.query(
            func.count(Order.order_id).label("total_orders"),
            func.coalesce(func.sum(Order.total_amount), 0.0).label("total_revenue"),
            func.max(Order.order_date).label("latest_date"),
        ).first()

        total_orders = order_stats.total_orders or 0
        total_revenue = float(order_stats.total_revenue or 0.0)
        latest_date = order_stats.latest_date

        # Customer & Product counts
        total_customers = db.query(func.count(Customer.customer_id)).scalar() or 0
        total_products = db.query(func.count(Product.product_id)).scalar() or 0

        # Marketing spend
        total_marketing_spend = float(
            db.query(func.coalesce(func.sum(Marketing.spend), 0.0)).scalar() or 0.0
        )

        # Returns count
        returned_orders = db.query(func.count(Order.order_id)).filter(
            Order.order_status.in_(["Returned", "Refunded"]) | (Order.refund_amount > 0)
        ).scalar() or 0

        # Active stockouts on latest available inventory date
        latest_inv_date = db.query(func.max(Inventory.date)).scalar()
        active_stockouts = 0
        if latest_inv_date:
            active_stockouts = db.query(func.count(Inventory.inventory_id)).filter(
                and_(Inventory.date == latest_inv_date, Inventory.stockout_flag == True)
            ).scalar() or 0

        aov = round(total_revenue / total_orders, 2) if total_orders > 0 else 0.0
        return_rate = round((returned_orders / total_orders) * 100, 2) if total_orders > 0 else 0.0

        return OverviewSummaryOut(
            total_revenue=round(total_revenue, 2),
            total_orders=total_orders,
            total_customers=total_customers,
            total_products=total_products,
            average_order_value=aov,
            total_marketing_spend=round(total_marketing_spend, 2),
            active_stockouts=active_stockouts,
            total_returned_orders=returned_orders,
            return_rate_pct=return_rate,
            latest_data_date=latest_date,
        )

    @staticmethod
    def get_customers(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        segment: Optional[str] = None,
        city: Optional[str] = None,
    ) -> Tuple[List[Customer], int]:
        query = db.query(Customer)
        if search:
            query = query.filter(Customer.customer_id.ilike(f"%{search}%"))
        if segment:
            query = query.filter(Customer.customer_segment == segment)
        if city:
            query = query.filter(Customer.city == city)

        total = query.count()
        items = query.order_by(Customer.customer_id).offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def get_products(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        category: Optional[str] = None,
        low_stock_only: bool = False,
    ) -> Tuple[List[Product], int]:
        query = db.query(Product)
        if search:
            query = query.filter(
                Product.product_name.ilike(f"%{search}%") | Product.product_id.ilike(f"%{search}%")
            )
        if category:
            query = query.filter(Product.category == category)
        if low_stock_only:
            query = query.filter(Product.current_stock <= Product.reorder_level)

        total = query.count()
        items = query.order_by(Product.product_id).offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def get_orders(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
        channel: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Tuple[List[Order], int]:
        query = db.query(Order)
        if status:
            query = query.filter(Order.order_status == status)
        if channel:
            query = query.filter(Order.channel == channel)
        if start_date:
            query = query.filter(Order.order_date >= start_date)
        if end_date:
            query = query.filter(Order.order_date <= end_date)

        total = query.count()
        items = query.order_by(desc(Order.order_date)).offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def get_inventory(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        product_id: Optional[str] = None,
        stockouts_only: bool = False,
        inventory_date: Optional[date] = None,
    ) -> Tuple[List[Inventory], int]:
        query = db.query(Inventory)
        if product_id:
            query = query.filter(Inventory.product_id == product_id)
        if stockouts_only:
            query = query.filter(Inventory.stockout_flag == True)
        if inventory_date:
            query = query.filter(Inventory.date == inventory_date)

        total = query.count()
        items = query.order_by(desc(Inventory.date)).offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def get_competitors(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        product_id: Optional[str] = None,
        competitor_name: Optional[str] = None,
    ) -> Tuple[List[Competitor], int]:
        query = db.query(Competitor)
        if product_id:
            query = query.filter(Competitor.product_id == product_id)
        if competitor_name:
            query = query.filter(Competitor.competitor_name.ilike(f"%{competitor_name}%"))

        total = query.count()
        items = query.order_by(desc(Competitor.date)).offset(skip).limit(limit).all()
        return items, total
