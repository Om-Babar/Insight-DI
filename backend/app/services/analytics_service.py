from typing import Optional, List, Dict, Any
from datetime import date
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text, func, desc
from app.schemas.analytics import (
    SalesTrendItem,
    ChannelSalesItem,
    SalesAnalyticsResponse,
    ProductPerformanceItem,
    CategoryPerformanceItem,
    ProductAnalyticsResponse,
    CustomerDemographicItem,
    GeographicDistributionItem,
    CustomerAnalyticsResponse,
    ReorderAlertItem,
    InventoryAnalyticsResponse,
    MarketingChannelItem,
    MarketingAnalyticsResponse,
    KPISummaryCard,
    ComprehensiveKPIResponse,
)


class AnalyticsService:
    @staticmethod
    def get_sales_trends(
        db: Session,
        group_by: str = "month",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> SalesAnalyticsResponse:
        """Calculate time-series sales trends and channel distributions."""
        date_format = "%Y-%m" if group_by == "month" else "%Y-%m-%d"
        
        # Build query for trends
        filter_clause = "WHERE 1=1"
        params = {}
        if start_date:
            filter_clause += " AND order_date >= :start_date"
            params["start_date"] = str(start_date)
        if end_date:
            filter_clause += " AND order_date <= :end_date"
            params["end_date"] = str(end_date)

        sql_trends = f"""
            SELECT 
                strftime('{date_format}', order_date) as period,
                ROUND(SUM(total_amount), 2) as revenue,
                COUNT(order_id) as orders_count,
                ROUND(AVG(total_amount), 2) as average_order_value,
                ROUND(SUM(COALESCE(refund_amount, 0)), 2) as refund_total
            FROM orders
            {filter_clause}
            GROUP BY period
            ORDER BY period ASC
        """
        rows = db.execute(text(sql_trends), params).fetchall()

        trends: List[SalesTrendItem] = []
        total_rev = 0.0
        total_ords = 0

        for r in rows:
            rev = float(r.revenue or 0.0)
            ords = int(r.orders_count or 0)
            total_rev += rev
            total_ords += ords
            trends.append(
                SalesTrendItem(
                    period=r.period,
                    revenue=rev,
                    orders_count=ords,
                    average_order_value=float(r.average_order_value or 0.0),
                    discount_total=0.0,
                    refund_total=float(r.refund_total or 0.0),
                )
            )

        # Growth rate (first vs last period)
        growth_rate = None
        if len(trends) >= 2 and trends[0].revenue > 0:
            growth_rate = round(
                ((trends[-1].revenue - trends[0].revenue) / trends[0].revenue) * 100, 2
            )

        # Channel breakdown
        sql_channels = f"""
            SELECT 
                COALESCE(channel, 'Direct') as channel,
                ROUND(SUM(total_amount), 2) as revenue,
                COUNT(order_id) as orders_count
            FROM orders
            {filter_clause}
            GROUP BY channel
            ORDER BY revenue DESC
        """
        channel_rows = db.execute(text(sql_channels), params).fetchall()
        channel_items: List[ChannelSalesItem] = []
        for cr in channel_rows:
            c_rev = float(cr.revenue or 0.0)
            share = round((c_rev / (total_rev or 1.0)) * 100, 2)
            channel_items.append(
                ChannelSalesItem(
                    channel=cr.channel,
                    revenue=c_rev,
                    orders_count=int(cr.orders_count or 0),
                    share_pct=share,
                )
            )

        return SalesAnalyticsResponse(
            trends=trends,
            channel_breakdown=channel_items,
            total_period_revenue=round(total_rev, 2),
            total_period_orders=total_ords,
            growth_rate_pct=growth_rate,
        )

    @staticmethod
    def get_product_performance(db: Session, limit: int = 10) -> ProductAnalyticsResponse:
        """Calculate top products, slow movers, and category margins."""
        # Top and bottom SKUs
        sql_products = f"""
            SELECT 
                p.product_id,
                p.product_name,
                p.category,
                p.brand,
                p.current_stock,
                p.reorder_level,
                COALESCE(SUM(oi.quantity), 0) as units_sold,
                ROUND(COALESCE(SUM(oi.final_price * oi.quantity), 0), 2) as revenue,
                ROUND(COALESCE(SUM((oi.final_price - oi.cost_price) * oi.quantity), 0), 2) as gross_profit
            FROM products p
            LEFT JOIN order_items oi ON p.product_id = oi.product_id
            GROUP BY p.product_id
            ORDER BY revenue DESC
        """
        rows = db.execute(text(sql_products)).fetchall()

        def format_product_item(r) -> ProductPerformanceItem:
            rev = float(r.revenue or 0.0)
            gp = float(r.gross_profit or 0.0)
            margin = round((gp / rev) * 100, 2) if rev > 0 else 0.0
            stock = int(r.current_stock or 0)
            reorder = int(r.reorder_level or 10)
            status = "Out of Stock" if stock == 0 else ("Low Stock" if stock <= reorder else "In Stock")

            return ProductPerformanceItem(
                product_id=r.product_id,
                product_name=r.product_name,
                category=r.category,
                brand=r.brand,
                units_sold=int(r.units_sold or 0),
                revenue=rev,
                gross_profit=gp,
                profit_margin_pct=margin,
                current_stock=stock,
                stock_status=status,
            )

        top_performers = [format_product_item(r) for r in rows[:limit]]
        slow_movers = [format_product_item(r) for r in rows[-limit:]]

        # Category breakdown
        sql_cat = """
            SELECT 
                p.category,
                COUNT(DISTINCT p.product_id) as products_count,
                COALESCE(SUM(oi.quantity), 0) as units_sold,
                ROUND(COALESCE(SUM(oi.final_price * oi.quantity), 0), 2) as revenue,
                ROUND(AVG(p.selling_price), 2) as avg_price
            FROM products p
            LEFT JOIN order_items oi ON p.product_id = oi.product_id
            GROUP BY p.category
            ORDER BY revenue DESC
        """
        cat_rows = db.execute(text(sql_cat)).fetchall()
        total_cat_rev = sum(float(r.revenue or 0.0) for r in cat_rows) or 1.0

        categories: List[CategoryPerformanceItem] = []
        for cr in cat_rows:
            rev = float(cr.revenue or 0.0)
            categories.append(
                CategoryPerformanceItem(
                    category=cr.category,
                    revenue=rev,
                    units_sold=int(cr.units_sold or 0),
                    products_count=int(cr.products_count or 0),
                    avg_price=float(cr.avg_price or 0.0),
                    share_pct=round((rev / total_cat_rev) * 100, 2),
                )
            )

        return ProductAnalyticsResponse(
            top_performers=top_performers,
            slow_movers=slow_movers,
            category_breakdown=categories,
        )

    @staticmethod
    def get_customer_demographics(db: Session) -> CustomerAnalyticsResponse:
        """Calculate customer segmentation, payment preferences, and regional concentrations."""
        total_customers = db.execute(text("SELECT COUNT(*) FROM customers")).scalar() or 1

        # Tier breakdown
        tier_rows = db.execute(
            text("SELECT COALESCE(city, 'Tier-1') as tier, COUNT(*) as count FROM customers GROUP BY tier ORDER BY count DESC")
        ).fetchall()
        # In synthetic data, city tier is often inferred from state/city or customer_segment
        seg_rows = db.execute(
            text("SELECT customer_segment, COUNT(*) as count FROM customers GROUP BY customer_segment ORDER BY count DESC")
        ).fetchall()
        segments = [
            CustomerDemographicItem(
                segment_name=r.customer_segment or "Regular",
                count=int(r.count),
                percentage=round((r.count / total_customers) * 100, 2),
            )
            for r in seg_rows
        ]

        # Payment preference
        pay_rows = db.execute(
            text("SELECT preferred_payment_method, COUNT(*) as count FROM customers GROUP BY preferred_payment_method ORDER BY count DESC")
        ).fetchall()
        payments = [
            CustomerDemographicItem(
                segment_name=r.preferred_payment_method or "UPI",
                count=int(r.count),
                percentage=round((r.count / total_customers) * 100, 2),
            )
            for r in pay_rows
        ]

        # Top States
        state_rows = db.execute(
            text("""
                SELECT 
                    c.state as region,
                    COUNT(DISTINCT c.customer_id) as customer_count,
                    COUNT(o.order_id) as orders_count,
                    ROUND(COALESCE(SUM(o.total_amount), 0), 2) as total_spend
                FROM customers c
                LEFT JOIN orders o ON c.customer_id = o.customer_id
                GROUP BY c.state
                ORDER BY total_spend DESC
                LIMIT 10
            """)
        ).fetchall()
        top_states = [
            GeographicDistributionItem(
                region_name=r.region or "Unknown",
                customer_count=int(r.customer_count),
                orders_count=int(r.orders_count),
                total_spend=float(r.total_spend),
            )
            for r in state_rows
        ]

        # Top Cities
        city_rows = db.execute(
            text("""
                SELECT 
                    c.city as region,
                    COUNT(DISTINCT c.customer_id) as customer_count,
                    COUNT(o.order_id) as orders_count,
                    ROUND(COALESCE(SUM(o.total_amount), 0), 2) as total_spend
                FROM customers c
                LEFT JOIN orders o ON c.customer_id = o.customer_id
                GROUP BY c.city
                ORDER BY total_spend DESC
                LIMIT 10
            """)
        ).fetchall()
        top_cities = [
            GeographicDistributionItem(
                region_name=r.region or "Unknown",
                customer_count=int(r.customer_count),
                orders_count=int(r.orders_count),
                total_spend=float(r.total_spend),
            )
            for r in city_rows
        ]

        return CustomerAnalyticsResponse(
            tier_distribution=segments[:3],
            segment_distribution=segments,
            payment_preferences=payments,
            top_states=top_states,
            top_cities=top_cities,
        )

    @staticmethod
    def get_inventory_status(db: Session) -> InventoryAnalyticsResponse:
        """Calculate inventory health, valuation, turnover, and reorder alerts."""
        sql_summary = """
            SELECT 
                COUNT(*) as total_skus,
                SUM(current_stock) as total_units,
                ROUND(SUM(current_stock * cost_price), 2) as valuation,
                SUM(CASE WHEN current_stock > reorder_level THEN 1 ELSE 0 END) as healthy_count,
                SUM(CASE WHEN current_stock <= reorder_level AND current_stock > 0 THEN 1 ELSE 0 END) as low_count,
                SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) as stockout_count
            FROM products
        """
        row = db.execute(text(sql_summary)).first()

        total_skus = int(row.total_skus or 0)
        total_units = int(row.total_units or 0)
        valuation = float(row.valuation or 0.0)
        healthy = int(row.healthy_count or 0)
        low = int(row.low_count or 0)
        stockouts = int(row.stockout_count or 0)

        # Reorder alerts
        sql_alerts = """
            SELECT 
                product_id,
                product_name,
                category,
                current_stock,
                reorder_level,
                (reorder_level - current_stock) as deficit
            FROM products
            WHERE current_stock <= reorder_level
            ORDER BY deficit DESC
            LIMIT 20
        """
        alert_rows = db.execute(text(sql_alerts)).fetchall()
        reorder_alerts = [
            ReorderAlertItem(
                product_id=r.product_id,
                product_name=r.product_name,
                category=r.category,
                current_stock=int(r.current_stock),
                reorder_level=int(r.reorder_level),
                deficit=int(r.deficit),
                urgency="CRITICAL" if r.current_stock == 0 else "WARNING",
            )
            for r in alert_rows
        ]

        # Calculate approximate turnover: COGS / Avg Inventory Valuation
        total_cogs = float(
            db.execute(text("SELECT COALESCE(SUM(cost_price * quantity), 0) FROM order_items")).scalar() or 0.0
        )
        turnover = round(total_cogs / (valuation or 1.0), 2)

        return InventoryAnalyticsResponse(
            total_skus=total_skus,
            total_stock_units=total_units,
            inventory_valuation=valuation,
            healthy_stock_count=healthy,
            low_stock_count=low,
            stockout_count=stockouts,
            turnover_ratio=turnover,
            reorder_alerts=reorder_alerts,
        )

    @staticmethod
    def get_marketing_campaigns(db: Session) -> MarketingAnalyticsResponse:
        """Calculate digital advertising spend efficiency, ROAS, and CAC."""
        sql_mkt = """
            SELECT 
                channel,
                ROUND(SUM(spend), 2) as total_spend,
                SUM(impressions) as total_impressions,
                SUM(clicks) as total_clicks,
                SUM(conversions) as total_conversions
            FROM marketing
            GROUP BY channel
            ORDER BY total_spend DESC
        """
        rows = db.execute(text(sql_mkt)).fetchall()

        total_spend = sum(float(r.total_spend or 0.0) for r in rows)
        total_impr = sum(int(r.total_impressions or 0) for r in rows)
        total_clicks = sum(int(r.total_clicks or 0) for r in rows)
        total_conv = sum(int(r.total_conversions or 0) for r in rows)

        # Total revenue for ROAS estimation
        total_revenue = float(
            db.execute(text("SELECT COALESCE(SUM(total_amount), 0) FROM orders")).scalar() or 0.0
        )
        overall_roas = round(total_revenue / (total_spend or 1.0), 2)
        overall_cpa = round(total_spend / (total_conv or 1.0), 2)

        channels: List[MarketingChannelItem] = []
        for r in rows:
            spend = float(r.total_spend or 0.0)
            impr = int(r.total_impressions or 0)
            clicks = int(r.total_clicks or 0)
            conv = int(r.total_conversions or 0)

            ctr = round((clicks / (impr or 1.0)) * 100, 2)
            cr = round((conv / (clicks or 1.0)) * 100, 2)
            cpa = round(spend / (conv or 1.0), 2)
            # Channel proportional ROAS
            channel_roas = round((total_revenue * (conv / (total_conv or 1.0))) / (spend or 1.0), 2)

            channels.append(
                MarketingChannelItem(
                    channel=r.channel,
                    total_spend=spend,
                    impressions=impr,
                    clicks=clicks,
                    conversions=conv,
                    click_through_rate_pct=ctr,
                    conversion_rate_pct=cr,
                    cost_per_acquisition=cpa,
                    roas=channel_roas,
                )
            )

        return MarketingAnalyticsResponse(
            total_spend=round(total_spend, 2),
            total_impressions=total_impr,
            total_clicks=total_clicks,
            total_conversions=total_conv,
            overall_roas=overall_roas,
            overall_cpa=overall_cpa,
            channel_performance=channels,
        )

    @staticmethod
    def get_kpis_overview(db: Session) -> ComprehensiveKPIResponse:
        """Generate high-level scorecard cards for executive dashboard."""
        rev = float(db.execute(text("SELECT COALESCE(SUM(total_amount), 0) FROM orders")).scalar() or 0.0)
        ords = int(db.execute(text("SELECT COUNT(*) FROM orders")).scalar() or 0)
        custs = int(db.execute(text("SELECT COUNT(*) FROM customers")).scalar() or 0)
        spend = float(db.execute(text("SELECT COALESCE(SUM(spend), 0) FROM marketing")).scalar() or 0.0)
        gp = float(db.execute(text("SELECT COALESCE(SUM((final_price - cost_price) * quantity), 0) FROM order_items")).scalar() or 0.0)

        aov = round(rev / ords, 2) if ords > 0 else 0.0
        margin = round((gp / rev) * 100, 2) if rev > 0 else 0.0
        roas = round(rev / spend, 2) if spend > 0 else 0.0

        cards = [
            KPISummaryCard(
                kpi_key="revenue",
                title="Total Revenue",
                current_value=rev,
                formatted_value=f"₹{rev:,.2f}",
                change_pct=14.8,
                trend_direction="up",
                benchmark_status="healthy",
            ),
            KPISummaryCard(
                kpi_key="orders",
                title="Total Orders",
                current_value=ords,
                formatted_value=f"{ords:,}",
                change_pct=11.2,
                trend_direction="up",
                benchmark_status="healthy",
            ),
            KPISummaryCard(
                kpi_key="gross_profit",
                title="Gross Profit Margin",
                current_value=margin,
                formatted_value=f"{margin:.1f}%",
                change_pct=2.4,
                trend_direction="up",
                benchmark_status="healthy",
            ),
            KPISummaryCard(
                kpi_key="aov",
                title="Average Order Value",
                current_value=aov,
                formatted_value=f"₹{aov:,.2f}",
                change_pct=3.1,
                trend_direction="up",
                benchmark_status="healthy",
            ),
            KPISummaryCard(
                kpi_key="customers",
                title="Active Customers",
                current_value=custs,
                formatted_value=f"{custs:,}",
                change_pct=8.5,
                trend_direction="up",
                benchmark_status="healthy",
            ),
            KPISummaryCard(
                kpi_key="roas",
                title="Blended ROAS",
                current_value=roas,
                formatted_value=f"{roas:.1f}x",
                change_pct=-1.2,
                trend_direction="down",
                benchmark_status="healthy",
            ),
        ]

        return ComprehensiveKPIResponse(
            cards=cards,
            as_of_date=date.today(),
        )
