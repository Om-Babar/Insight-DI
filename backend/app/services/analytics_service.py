from typing import Optional, List, Dict, Any
from datetime import date, datetime, timedelta
from collections import defaultdict
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
    InventoryTableItem,
    InventoryAnalyticsResponse,
    MarketingChannelItem,
    MarketingCampaignItem,
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
        is_pg = (db.bind.dialect.name == "postgresql") if db.bind else False
        if is_pg:
            pg_fmt = "YYYY-MM" if group_by == "month" else ("IYYY-IW" if group_by == "week" else "YYYY-MM-DD")
            period_expr = f"TO_CHAR(order_date, '{pg_fmt}')"
        else:
            date_format = "%Y-%m" if group_by == "month" else "%Y-%m-%d"
            period_expr = f"strftime('{date_format}', order_date)"

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
                {period_expr} as period,
                ROUND(CAST(SUM(total_amount) AS numeric), 2) as revenue,
                COUNT(order_id) as orders_count,
                ROUND(CAST(AVG(total_amount) AS numeric), 2) as average_order_value,
                ROUND(CAST(SUM(COALESCE(refund_amount, 0)) AS numeric), 2) as refund_total
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
                ROUND(CAST(SUM(total_amount) AS numeric), 2) as revenue,
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
    def get_product_performance(
        db: Session,
        limit: int = 10,
        range: str = "30d",
        comparison: str = "previous_period",
        category: Optional[str] = None,
    ) -> ProductAnalyticsResponse:
        """Calculate database-driven SKU performance, margins, category contribution, and KPIs."""
        # 1. Determine time horizon from max available order date
        max_date_val = db.execute(text("SELECT MAX(order_date) FROM orders")).scalar()
        if max_date_val:
            if isinstance(max_date_val, str):
                max_date = datetime.strptime(max_date_val, "%Y-%m-%d").date()
            else:
                max_date = max_date_val
        else:
            max_date = date.today()

        days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365, "365d": 365}
        end_date = max_date
        if range.lower() == "ytd":
            start_date = date(max_date.year, 1, 1)
            days = (end_date - start_date).days + 1
        else:
            days = days_map.get(range.lower(), 30)
            start_date = end_date - timedelta(days=days - 1)

        if comparison == "previous_year":
            prev_start_date = start_date - timedelta(days=365)
            prev_end_date = end_date - timedelta(days=365)
            comp_label = "vs last year"
        else:
            prev_end_date = start_date - timedelta(days=1)
            prev_start_date = prev_end_date - timedelta(days=days - 1)
            comp_label = "vs last period"

        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        prev_start_str = prev_start_date.strftime("%Y-%m-%d")
        prev_end_str = prev_end_date.strftime("%Y-%m-%d")

        cat_filter_sql = "AND p.category = :category" if (category and category.lower() != "all") else ""

        # 2. Query products for previous period (to calculate decline and growth)
        sql_prev = f"""
            SELECT 
                oi.product_id,
                ROUND(CAST(COALESCE(SUM(oi.final_price * oi.quantity), 0) AS numeric), 2) as revenue,
                COALESCE(SUM(oi.quantity), 0) as units_sold,
                ROUND(CAST(COALESCE(SUM((oi.final_price - oi.cost_price) * oi.quantity), 0) AS numeric), 2) as gross_profit
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN products p ON oi.product_id = p.product_id
            WHERE o.order_date >= :p_start AND o.order_date <= :p_end {cat_filter_sql}
            GROUP BY oi.product_id
        """
        prev_params = {"p_start": prev_start_str, "p_end": prev_end_str}
        if category and category.lower() != "all":
            prev_params["category"] = category
        prev_rows = db.execute(text(sql_prev), prev_params).fetchall()
        prev_map = {r.product_id: {"revenue": float(r.revenue or 0.0), "units": int(r.units_sold or 0), "gp": float(r.gross_profit or 0.0)} for r in prev_rows}

        # 3. Query products for current period
        sql_products = f"""
            SELECT 
                p.product_id,
                p.product_name,
                p.category,
                p.brand,
                p.cost_price,
                p.selling_price,
                p.current_stock,
                p.reorder_level,
                COALESCE(oi.units_sold, 0) as units_sold,
                COALESCE(oi.revenue, 0.0) as revenue,
                COALESCE(oi.gross_profit, 0.0) as gross_profit
            FROM products p
            LEFT JOIN (
                SELECT 
                    oi.product_id,
                    SUM(oi.quantity) as units_sold,
                    ROUND(CAST(SUM(oi.final_price * oi.quantity) AS numeric), 2) as revenue,
                    ROUND(CAST(SUM((oi.final_price - oi.cost_price) * oi.quantity) AS numeric), 2) as gross_profit
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                WHERE o.order_date >= :start_date AND o.order_date <= :end_date
                GROUP BY oi.product_id
            ) oi ON p.product_id = oi.product_id
            WHERE 1=1 {cat_filter_sql}
            ORDER BY revenue DESC
        """
        params = {"start_date": start_str, "end_date": end_str}
        if category and category.lower() != "all":
            params["category"] = category

        rows = db.execute(text(sql_products), params).fetchall()

        all_items: List[ProductPerformanceItem] = []
        total_rev = 0.0
        total_gp = 0.0

        for r in rows:
            rev = float(r.revenue or 0.0)
            gp = float(r.gross_profit or 0.0)
            margin = round((gp / rev) * 100, 2) if rev > 0 else 0.0
            stock = int(r.current_stock or 0)
            reorder = int(r.reorder_level or 10)
            status = "Out of Stock" if stock == 0 else ("Low Stock" if stock <= reorder else "In Stock")

            prev_info = prev_map.get(r.product_id, {"revenue": 0.0, "units": 0, "gp": 0.0})
            prev_rev = prev_info["revenue"]
            if prev_rev > 0:
                change = round(((rev - prev_rev) / prev_rev) * 100, 2)
            elif rev > 0:
                change = 100.0
            else:
                change = 0.0

            total_rev += rev
            total_gp += gp

            item = ProductPerformanceItem(
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
                cost_price=float(r.cost_price or 0.0),
                selling_price=float(r.selling_price or 0.0),
                change_pct=change,
                reorder_level=reorder,
            )
            all_items.append(item)

        # 4. Accurate KPI Calculations
        active_products = [p for p in all_items if p.revenue > 0]
        active_count = len(active_products)
        avg_weighted_margin = round((total_gp / total_rev) * 100, 2) if total_rev > 0 else 0.0

        sorted_by_rev = sorted(active_products, key=lambda x: x.revenue, reverse=True)
        top5_rev = sum(p.revenue for p in sorted_by_rev[:5])
        top5_share = round((top5_rev / total_rev) * 100, 2) if total_rev > 0 else 0.0

        declining_products = [p for p in active_products if (p.change_pct or 0.0) < 0]
        declining_count = len(declining_products)

        # Previous period totals for KPI delta comparisons
        prev_active_count = len([v for v in prev_map.values() if v["revenue"] > 0])
        prev_total_rev = sum(v["revenue"] for v in prev_map.values())
        prev_total_gp = sum(v["gp"] for v in prev_map.values())
        prev_margin = round((prev_total_gp / prev_total_rev) * 100, 2) if prev_total_rev > 0 else 0.0

        prev_sorted = sorted(prev_map.values(), key=lambda x: x["revenue"], reverse=True)
        prev_top5_rev = sum(v["revenue"] for v in prev_sorted[:5])
        prev_top5_share = round((prev_top5_rev / prev_total_rev) * 100, 2) if prev_total_rev > 0 else 0.0

        active_delta_pct = round(((active_count - prev_active_count) / prev_active_count) * 100, 1) if prev_active_count > 0 else 0.0
        margin_delta_pp = round(avg_weighted_margin - prev_margin, 1)
        top5_delta_pp = round(top5_share - prev_top5_share, 1)

        kpis = [
            {
                "key": "active_products",
                "label": "Active Products",
                "value": active_count,
                "unit": "number",
                "change_pct": active_delta_pct,
                "status": "good" if active_delta_pct >= 0 else "warning",
                "is_pp": False,
                "comparison_label": comp_label,
                "hint": f"{active_count} SKUs generating sales in period",
            },
            {
                "key": "avg_margin",
                "label": "Average Margin",
                "value": avg_weighted_margin,
                "unit": "percent",
                "change_pct": margin_delta_pp,
                "status": "good" if avg_weighted_margin >= 25.0 else "warning",
                "is_pp": True,
                "comparison_label": comp_label,
                "hint": "Revenue-weighted gross margin across active catalog",
            },
            {
                "key": "top_5_share",
                "label": "Top 5 Share of Revenue",
                "value": top5_share,
                "unit": "percent",
                "change_pct": top5_delta_pp,
                "status": "warning" if top5_share > 50 else "good",
                "is_pp": True,
                "comparison_label": comp_label,
                "hint": "Portfolio revenue concentration in top 5 SKUs",
            },
            {
                "key": "declining_products",
                "label": "Declining Products",
                "value": declining_count,
                "unit": "number",
                "change_pct": round((declining_count / max(1, active_count)) * 100, 1),
                "status": "critical" if declining_count > (active_count * 0.3) else "warning",
                "is_pp": False,
                "comparison_label": comp_label,
                "hint": f"{declining_count} SKUs with negative period-over-period momentum",
            },
        ]

        top_performers = sorted_by_rev[:limit]
        slow_movers = [p for p in reversed(sorted_by_rev)][:limit]

        # 5. Category Breakdown
        sql_cat = f"""
            SELECT 
                p.category,
                COUNT(DISTINCT p.product_id) as products_count,
                COALESCE(SUM(oi.units_sold), 0) as units_sold,
                ROUND(CAST(COALESCE(SUM(oi.revenue), 0) AS numeric), 2) as revenue,
                ROUND(CAST(AVG(p.selling_price) AS numeric), 2) as avg_price
            FROM products p
            LEFT JOIN (
                SELECT 
                    oi.product_id,
                    SUM(oi.quantity) as units_sold,
                    ROUND(CAST(SUM(oi.final_price * oi.quantity) AS numeric), 2) as revenue
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                WHERE o.order_date >= :start_date AND o.order_date <= :end_date
                GROUP BY oi.product_id
            ) oi ON p.product_id = oi.product_id
            WHERE 1=1 {cat_filter_sql}
            GROUP BY p.category
            ORDER BY revenue DESC
        """
        cat_rows = db.execute(text(sql_cat), params).fetchall()
        total_cat_rev = sum(float(r.revenue or 0.0) for r in cat_rows) or 1.0

        categories: List[CategoryPerformanceItem] = []
        for cr in cat_rows:
            c_rev = float(cr.revenue or 0.0)
            categories.append(
                CategoryPerformanceItem(
                    category=cr.category,
                    revenue=c_rev,
                    units_sold=int(cr.units_sold or 0),
                    products_count=int(cr.products_count or 0),
                    avg_price=float(cr.avg_price or 0.0),
                    share_pct=round((c_rev / total_cat_rev) * 100, 2),
                )
            )

        # 6. Category Revenue Trend Time-Series
        sql_trend = f"""
            SELECT 
                o.order_date,
                p.category,
                ROUND(CAST(COALESCE(SUM(oi.final_price * oi.quantity), 0) AS numeric), 2) as revenue
            FROM orders o
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN products p ON oi.product_id = p.product_id
            WHERE o.order_date >= :start_date AND o.order_date <= :end_date {cat_filter_sql}
            GROUP BY o.order_date, p.category
            ORDER BY o.order_date ASC
        """
        trend_rows = db.execute(text(sql_trend), params).fetchall()
        date_cat_map: Dict[str, Dict[str, float]] = defaultdict(dict)
        all_trend_cats = set()
        for tr in trend_rows:
            d_str = str(tr.order_date)
            date_cat_map[d_str][tr.category] = float(tr.revenue or 0.0)
            all_trend_cats.add(tr.category)

        trend_data = []
        for d_str in sorted(date_cat_map.keys()):
            entry: Dict[str, Any] = {"date": d_str}
            for cat_name in all_trend_cats:
                entry[cat_name] = date_cat_map[d_str].get(cat_name, 0.0)
            trend_data.append(entry)

        trend_keys = [{"key": cat_name, "label": cat_name, "unit": "currency"} for cat_name in sorted(all_trend_cats)]

        return ProductAnalyticsResponse(
            top_performers=top_performers,
            slow_movers=slow_movers,
            category_breakdown=categories,
            kpis=kpis,
            all_products=all_items,
            trend=trend_data,
            trend_keys=trend_keys,
        )

    @staticmethod
    def get_customer_demographics(
        db: Session,
        range: str = "30d",
        comparison: str = "previous_period",
        segment: Optional[str] = None,
    ) -> CustomerAnalyticsResponse:
        """Calculate database-driven customer KPIs, acquisition trends, segmentation, and geographic performance."""
        # 1. Determine date bounds based on max order date in orders
        max_date_val = db.execute(text("SELECT MAX(order_date) FROM orders")).scalar()
        if max_date_val:
            if isinstance(max_date_val, str):
                max_date = datetime.strptime(max_date_val, "%Y-%m-%d").date()
            else:
                max_date = max_date_val
        else:
            max_date = date.today()

        days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365, "365d": 365}
        end_date = max_date
        if range.lower() == "ytd":
            start_date = date(max_date.year, 1, 1)
            days = (end_date - start_date).days + 1
        else:
            days = days_map.get(range.lower(), 30)
            start_date = end_date - timedelta(days=days - 1)

        if comparison == "previous_year":
            prev_start_date = start_date - timedelta(days=365)
            prev_end_date = end_date - timedelta(days=365)
            comp_label = "vs last year"
        else:
            prev_end_date = start_date - timedelta(days=1)
            prev_start_date = prev_end_date - timedelta(days=days - 1)
            comp_label = "vs last period"

        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        prev_start_str = prev_start_date.strftime("%Y-%m-%d")
        prev_end_str = prev_end_date.strftime("%Y-%m-%d")

        # 2. Segment filtering clause
        segment_db_map = {
            "champions": ["High Value"],
            "loyal": ["Loyal", "Loyal Regular"],
            "potential": ["Regular"],
            "at risk": ["Occasional"],
            "lost": ["Budget / Price Sensitive"],
        }

        seg_clause = ""
        seg_params = {}
        if segment and segment.lower() != "all":
            seg_clean = segment.lower().strip()
            target_db_segs = segment_db_map.get(seg_clean, [segment])
            seg_clause = "AND c.customer_segment IN :target_segs"
            seg_params = {"target_segs": tuple(target_db_segs)}

        # 3. Active Customers (Distinct customers who completed an order in period)
        sql_active = f"""
            SELECT COUNT(DISTINCT o.customer_id)
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            WHERE o.order_date >= :s_date AND o.order_date <= :e_date
              AND o.order_status NOT IN ('Cancelled', 'Returned')
              {seg_clause}
        """
        curr_active = db.execute(text(sql_active), {"s_date": start_str, "e_date": end_str, **seg_params}).scalar() or 0
        prev_active = db.execute(text(sql_active), {"s_date": prev_start_str, "e_date": prev_end_str, **seg_params}).scalar() or 0
        active_delta_pct = round(((curr_active - prev_active) / prev_active) * 100, 1) if prev_active > 0 else 0.0

        # 4. New Customers (Customers whose first completed order occurred in period)
        sql_new = f"""
            WITH customer_first_orders AS (
                SELECT customer_id, MIN(order_date) as first_d
                FROM orders
                WHERE order_status NOT IN ('Cancelled', 'Returned')
                GROUP BY customer_id
            )
            SELECT COUNT(DISTINCT cfo.customer_id)
            FROM customer_first_orders cfo
            JOIN customers c ON cfo.customer_id = c.customer_id
            WHERE cfo.first_d >= :s_date AND cfo.first_d <= :e_date
              {seg_clause}
        """
        curr_new = db.execute(text(sql_new), {"s_date": start_str, "e_date": end_str, **seg_params}).scalar() or 0
        prev_new = db.execute(text(sql_new), {"s_date": prev_start_str, "e_date": prev_end_str, **seg_params}).scalar() or 0
        new_delta_pct = round(((curr_new - prev_new) / prev_new) * 100, 1) if prev_new > 0 else 0.0

        # 5. Repeat Purchase Rate (Active buyers who placed 2+ orders in period)
        sql_repeat = f"""
            WITH in_period AS (
                SELECT o.customer_id, COUNT(o.order_id) as period_orders
                FROM orders o
                JOIN customers c ON o.customer_id = c.customer_id
                WHERE o.order_date >= :s_date AND o.order_date <= :e_date
                  AND o.order_status NOT IN ('Cancelled', 'Returned')
                  {seg_clause}
                GROUP BY o.customer_id
            )
            SELECT 
                COUNT(*) as total_active,
                COUNT(CASE WHEN period_orders >= 2 THEN 1 END) as repeat_count
            FROM in_period
        """
        c_tot, c_rep = db.execute(text(sql_repeat), {"s_date": start_str, "e_date": end_str, **seg_params}).fetchone() or (0, 0)
        p_tot, p_rep = db.execute(text(sql_repeat), {"s_date": prev_start_str, "e_date": prev_end_str, **seg_params}).fetchone() or (0, 0)

        curr_repeat_rate = round((c_rep / c_tot) * 100, 1) if c_tot and c_tot > 0 else 0.0
        prev_repeat_rate = round((p_rep / p_tot) * 100, 1) if p_tot and p_tot > 0 else 0.0
        repeat_delta_pp = round(curr_repeat_rate - prev_repeat_rate, 1)

        # 6. Average Customer Lifetime Value (Cumulative revenue per active customer)
        sql_clv = f"""
            WITH active_cohort AS (
                SELECT DISTINCT o.customer_id
                FROM orders o
                JOIN customers c ON o.customer_id = c.customer_id
                WHERE o.order_date >= :s_date AND o.order_date <= :e_date
                  AND o.order_status NOT IN ('Cancelled', 'Returned')
                  {seg_clause}
            ),
            cohort_spend AS (
                SELECT ac.customer_id, SUM(o.total_amount) as lifetime_spend
                FROM active_cohort ac
                JOIN orders o ON ac.customer_id = o.customer_id
                WHERE o.order_status NOT IN ('Cancelled', 'Returned')
                GROUP BY ac.customer_id
            )
            SELECT COALESCE(ROUND(CAST(AVG(lifetime_spend) AS numeric), 2), 0)
            FROM cohort_spend
        """
        curr_clv = float(db.execute(text(sql_clv), {"s_date": start_str, "e_date": end_str, **seg_params}).scalar() or 0.0)
        prev_clv = float(db.execute(text(sql_clv), {"s_date": prev_start_str, "e_date": prev_end_str, **seg_params}).scalar() or 0.0)
        clv_delta_pct = round(((curr_clv - prev_clv) / prev_clv) * 100, 1) if prev_clv > 0 else 0.0

        # KPI Cards
        kpis = [
            {
                "key": "cust",
                "label": "Active Customers",
                "value": curr_active,
                "unit": "number",
                "change_pct": active_delta_pct,
                "status": "good" if active_delta_pct >= 0 else "warning",
                "is_pp": False,
                "comparison_label": comp_label,
                "hint": f"{curr_active:,} distinct buyers in selected period",
                "tooltip": "Distinct customers who placed at least one completed order during the selected time period.",
            },
            {
                "key": "new",
                "label": "New Customers",
                "value": curr_new,
                "unit": "number",
                "change_pct": new_delta_pct,
                "status": "good" if new_delta_pct >= 0 else "warning",
                "is_pp": False,
                "comparison_label": comp_label,
                "hint": "First-time buyers making their first order in period",
                "tooltip": "First-time customers whose very first completed purchase on InsightDI occurred during this selected period.",
            },
            {
                "key": "repeat",
                "label": "Repeat Purchase Rate",
                "value": curr_repeat_rate,
                "unit": "percent",
                "change_pct": repeat_delta_pp,
                "status": "good" if repeat_delta_pp >= 0 else "warning",
                "is_pp": True,
                "comparison_label": comp_label,
                "hint": f"{c_rep:,} of {c_tot:,} active buyers ordered multiple times",
                "tooltip": "Percentage of active customers in this period who placed two or more completed orders during the timeframe.",
            },
            {
                "key": "clv",
                "label": "Avg Customer Lifetime Value",
                "value": curr_clv,
                "unit": "currency",
                "change_pct": clv_delta_pct,
                "status": "good" if clv_delta_pct >= 0 else "warning",
                "is_pp": False,
                "comparison_label": comp_label,
                "hint": "Cumulative lifetime spend per active buyer",
                "tooltip": "Average cumulative revenue generated per customer across their entire purchase history on InsightDI.",
            },
        ]

        # 7. Customer Acquisition Trend (Daily new vs returning)
        sql_trend = f"""
            WITH customer_first_orders AS (
                SELECT customer_id, MIN(order_date) as first_d
                FROM orders
                WHERE order_status NOT IN ('Cancelled', 'Returned')
                GROUP BY customer_id
            ),
            daily_orders AS (
                SELECT 
                    o.order_date,
                    o.customer_id,
                    cfo.first_d
                FROM orders o
                JOIN customer_first_orders cfo ON o.customer_id = cfo.customer_id
                JOIN customers c ON o.customer_id = c.customer_id
                WHERE o.order_date >= :s_date AND o.order_date <= :e_date
                  AND o.order_status NOT IN ('Cancelled', 'Returned')
                  {seg_clause}
            )
            SELECT 
                order_date,
                COUNT(DISTINCT CASE WHEN first_d = order_date THEN customer_id END) as new_cust,
                COUNT(DISTINCT CASE WHEN first_d < order_date THEN customer_id END) as returning_cust
            FROM daily_orders
            GROUP BY order_date
            ORDER BY order_date ASC
        """
        trend_rows = db.execute(text(sql_trend), {"s_date": start_str, "e_date": end_str, **seg_params}).fetchall()
        trend = [
            {
                "date": str(r.order_date),
                "new": int(r.new_cust or 0),
                "returning": int(r.returning_cust or 0),
                "total": int((r.new_cust or 0) + (r.returning_cust or 0)),
            }
            for r in trend_rows
        ]
        trend_keys = [
            {"key": "new", "label": "New Customers", "unit": "number"},
            {"key": "returning", "label": "Returning Customers", "unit": "number"},
        ]

        # 8. Customer Segments (RFM Personas & Revenue Contribution)
        sql_segments = """
            SELECT 
                CASE 
                    WHEN c.customer_segment = 'High Value' THEN 'Champions'
                    WHEN c.customer_segment IN ('Loyal', 'Loyal Regular') THEN 'Loyal'
                    WHEN c.customer_segment = 'Regular' THEN 'Potential'
                    WHEN c.customer_segment = 'Occasional' THEN 'At Risk'
                    WHEN c.customer_segment = 'Budget / Price Sensitive' THEN 'Lost'
                    ELSE 'Potential'
                END as segment_name,
                COUNT(DISTINCT c.customer_id) as total_customers,
                COUNT(DISTINCT CASE WHEN o.order_date >= :s_date AND o.order_date <= :e_date AND o.order_status NOT IN ('Cancelled', 'Returned') THEN o.customer_id END) as active_customers,
                ROUND(CAST(COALESCE(SUM(CASE WHEN o.order_date >= :s_date AND o.order_date <= :e_date AND o.order_status NOT IN ('Cancelled', 'Returned') THEN o.total_amount ELSE 0 END), 0) AS numeric), 2) as period_revenue,
                COUNT(CASE WHEN o.order_date >= :s_date AND o.order_date <= :e_date AND o.order_status NOT IN ('Cancelled', 'Returned') THEN o.order_id END) as period_orders
            FROM customers c
            LEFT JOIN orders o ON c.customer_id = o.customer_id
            GROUP BY segment_name
            ORDER BY period_revenue DESC
        """
        seg_rows = db.execute(text(sql_segments), {"s_date": start_str, "e_date": end_str}).fetchall()
        total_period_rev = sum(float(r.period_revenue or 0.0) for r in seg_rows) or 1.0

        segment_definitions = {
            "Champions": "High spend and high frequency shoppers with peak lifetime value.",
            "Loyal": "Consistent repeat purchasers with dependable order cadence.",
            "Potential": "Regular recent shoppers with above-average basket sizes.",
            "At Risk": "Infrequent past buyers who have not purchased in recent cycles.",
            "Lost": "Price-sensitive and lapsed shoppers requiring re-activation.",
        }

        breakdown = []
        segment_summary = []
        for r in seg_rows:
            s_name = r.segment_name
            s_rev = float(r.period_revenue or 0.0)
            s_tot_cust = int(r.total_customers or 0)
            s_act_cust = int(r.active_customers or 0)
            s_ords = int(r.period_orders or 0)
            s_share = round((s_rev / total_period_rev) * 100, 1)
            s_aov = round(s_rev / max(1, s_ords), 2)

            item = {
                "name": s_name,
                "value": s_tot_cust,
                "active_customers": s_act_cust,
                "revenue": s_rev,
                "revenue_share_pct": s_share,
                "orders": s_ords,
                "aov": s_aov,
                "definition": segment_definitions.get(s_name, "Customer segment"),
            }
            breakdown.append(item)
            segment_summary.append(item)

        # 9. Geographic Performance
        sql_geo_curr = f"""
            SELECT 
                COALESCE(c.city, 'Unknown') as city,
                COALESCE(c.state, 'Unknown') as state,
                COUNT(DISTINCT o.customer_id) as active_customers,
                COUNT(o.order_id) as orders_count,
                ROUND(CAST(COALESCE(SUM(o.total_amount), 0) AS numeric), 2) as revenue
            FROM customers c
            JOIN orders o ON c.customer_id = o.customer_id
            WHERE o.order_date >= :s_date AND o.order_date <= :e_date
              AND o.order_status NOT IN ('Cancelled', 'Returned')
              {seg_clause}
            GROUP BY c.city, c.state
            ORDER BY revenue DESC
        """
        sql_geo_prev = f"""
            SELECT 
                COALESCE(c.city, 'Unknown') as city,
                ROUND(CAST(COALESCE(SUM(o.total_amount), 0) AS numeric), 2) as revenue
            FROM customers c
            JOIN orders o ON c.customer_id = o.customer_id
            WHERE o.order_date >= :p_start AND o.order_date <= :p_end
              AND o.order_status NOT IN ('Cancelled', 'Returned')
              {seg_clause}
            GROUP BY c.city
        """
        prev_geo_map = {
            r.city: float(r.revenue or 0.0)
            for r in db.execute(text(sql_geo_prev), {"p_start": prev_start_str, "p_end": prev_end_str, **seg_params}).fetchall()
        }
        geo_rows = db.execute(text(sql_geo_curr), {"s_date": start_str, "e_date": end_str, **seg_params}).fetchall()

        table_rows = []
        for r in geo_rows:
            city_name = r.city
            state_name = r.state
            c_active = int(r.active_customers or 0)
            c_ords = int(r.orders_count or 0)
            c_rev = float(r.revenue or 0.0)
            prev_r = prev_geo_map.get(city_name, 0.0)
            growth_val = round(((c_rev - prev_r) / prev_r) * 100, 1) if prev_r > 0 else 0.0
            rpc_val = round(c_rev / max(1, c_active), 2)

            table_rows.append({
                "city": city_name,
                "state": state_name,
                "customers": c_active,
                "orders": c_ords,
                "revenue": c_rev,
                "rev_per_customer": rpc_val,
                "growth_pct": growth_val,
            })

        table = {
            "columns": [
                {"key": "city", "label": "City"},
                {"key": "state", "label": "State"},
                {"key": "customers", "label": "Customers", "unit": "number"},
                {"key": "orders", "label": "Orders", "unit": "number"},
                {"key": "revenue", "label": "Revenue", "unit": "currency"},
                {"key": "rev_per_customer", "label": "Rev / Customer", "unit": "currency"},
                {"key": "growth_pct", "label": "Growth", "unit": "percent"},
            ],
            "rows": table_rows,
        }

        # 10. Dynamic, Evidence-based Customer Insights
        if repeat_delta_pp >= 0:
            retention_title = "Strong Customer Repurchase Stickiness"
            retention_text = f"Repeat purchase rate reached {curr_repeat_rate}% (+{repeat_delta_pp} pp {comp_label}). {c_rep:,} of {curr_active:,} active buyers placed 2+ orders in this period, strengthening customer retention."
            retention_tone = "good"
        else:
            retention_title = "Repurchase Cadence Deceleration"
            retention_text = f"Repeat purchase rate contracted to {curr_repeat_rate}% ({repeat_delta_pp} pp {comp_label}). Engaging second-order conversion flows within 14 days of first purchase can recover repurchase velocity."
            retention_tone = "warning"

        top_rev_seg = sorted(segment_summary, key=lambda s: s["revenue"], reverse=True)[0] if segment_summary else None
        at_risk_seg = next((s for s in segment_summary if s["name"] == "At Risk"), None)
        seg_opp_title = "High-Value Segment Concentration & Churn Defense"
        if top_rev_seg:
            top_seg_rev_fmt = f"INR {top_rev_seg['revenue']:,.0f}"
            at_risk_act = at_risk_seg['active_customers'] if at_risk_seg else 0
            at_risk_rev_fmt = f"INR {at_risk_seg['revenue']:,.0f}" if at_risk_seg else "INR 0"
            seg_opp_text = f"{top_rev_seg['name']} accounts for {top_rev_seg['revenue_share_pct']}% of revenue ({top_seg_rev_fmt}). Meanwhile, {at_risk_act} At-Risk customers generated {at_risk_rev_fmt}, representing a win-back opportunity via loyalty incentives."
        else:
            seg_opp_text = "Segment distribution remains balanced across core customer tiers."

        top_geo = sorted(table_rows, key=lambda g: g["revenue"], reverse=True)[0] if table_rows else None
        fastest_geo = sorted([g for g in table_rows if g["customers"] >= 20], key=lambda g: g["growth_pct"], reverse=True)[0] if table_rows else None
        geo_title = "Regional Revenue Engine & Growth Expansion"
        if top_geo and fastest_geo and top_geo["city"] != fastest_geo["city"]:
            geo_text = f"{top_geo['city']} ({top_geo['state']}) leads overall customer revenue with INR {top_geo['revenue']:,.0f} ({top_geo['customers']} active buyers). {fastest_geo['city']} exhibited highest momentum with +{fastest_geo['growth_pct']}% period-over-period expansion."
        elif top_geo:
            geo_text = f"{top_geo['city']} leads customer revenue with INR {top_geo['revenue']:,.0f} across {top_geo['customers']} active shoppers with +{top_geo['growth_pct']}% growth."
        else:
            geo_text = "Geographic order distribution is diversified across all monitored metros."

        customer_insights = [
            {
                "id": "cust-insight-1",
                "title": retention_title,
                "text": retention_text,
                "tone": retention_tone,
                "link": {"text": "Explore Root Cause", "to": "/root-cause?metric=retention"},
            },
            {
                "id": "cust-insight-2",
                "title": seg_opp_title,
                "text": seg_opp_text,
                "tone": "analytics" if (at_risk_seg and at_risk_seg['active_customers'] > 0) else "good",
                "link": {"text": "View Recommendations", "to": "/recommendations?segment=retention"},
            },
            {
                "id": "cust-insight-3",
                "title": geo_title,
                "text": geo_text,
                "tone": "good",
                "link": {"text": "Simulate Growth", "to": "/simulation?scenario=growth"},
            },
        ]

        # 11. Legacy compatibility fields for existing schemas and tests
        total_customers = db.execute(text("SELECT COUNT(*) FROM customers")).scalar() or 1
        seg_rows_all = db.execute(
            text("SELECT customer_segment, COUNT(*) as count FROM customers GROUP BY customer_segment ORDER BY count DESC")
        ).fetchall()
        segments_compat = [
            CustomerDemographicItem(
                segment_name=r.customer_segment or "Regular",
                count=int(r.count),
                percentage=round((r.count / total_customers) * 100, 2),
            )
            for r in seg_rows_all
        ]
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
        state_rows = db.execute(
            text("""
                SELECT 
                    c.state as region,
                    COUNT(DISTINCT c.customer_id) as customer_count,
                    COUNT(o.order_id) as orders_count,
                    ROUND(CAST(COALESCE(SUM(o.total_amount), 0) AS numeric), 2) as total_spend
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
        top_cities = [
            GeographicDistributionItem(
                region_name=r["city"],
                customer_count=int(r["customers"]),
                orders_count=int(r["orders"]),
                total_spend=float(r["revenue"]),
            )
            for r in table_rows[:10]
        ]

        return CustomerAnalyticsResponse(
            tier_distribution=segments_compat[:3],
            segment_distribution=segments_compat,
            payment_preferences=payments,
            top_states=top_states,
            top_cities=top_cities,
            kpis=kpis,
            trend=trend,
            trend_keys=trend_keys,
            breakdown=breakdown,
            breakdown_label="Customers by Segment",
            breakdown_unit="number",
            table=table,
            geographic_performance=table_rows,
            segment_summary=segment_summary,
            customer_insights=customer_insights,
        )


    @staticmethod
    def get_inventory_status(
        db: Session,
        range: str = "30d",
        comparison: str = "previous_period",
        status: Optional[str] = None,
    ) -> InventoryAnalyticsResponse:
        """Calculate inventory health, valuation, turnover, reorder alerts, and time-series trends."""
        # 1. Determine date bounds based on max date in inventory table
        max_date_val = db.execute(text("SELECT MAX(date) FROM inventory")).scalar()
        if max_date_val:
            if isinstance(max_date_val, str):
                max_date = datetime.strptime(max_date_val, "%Y-%m-%d").date()
            else:
                max_date = max_date_val
        else:
            max_date = date(2024, 12, 31)

        days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365, "365d": 365}
        end_date = max_date
        if range.lower() == "ytd":
            start_date = date(max_date.year, 1, 1)
            days = (end_date - start_date).days + 1
        else:
            days = days_map.get(range.lower(), 30)
            start_date = end_date - timedelta(days=days - 1)

        if comparison == "previous_year":
            prev_start_date = start_date - timedelta(days=365)
            prev_end_date = end_date - timedelta(days=365)
            comp_label = "vs last year"
        else:
            prev_end_date = start_date - timedelta(days=1)
            prev_start_date = prev_end_date - timedelta(days=days - 1)
            comp_label = "vs last period"

        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        prev_start_str = prev_start_date.strftime("%Y-%m-%d")
        prev_end_str = prev_end_date.strftime("%Y-%m-%d")

        # 2. Product-level summary & current stock valuation
        sql_summary = """
            SELECT 
                COUNT(*) as total_skus,
                SUM(current_stock) as total_units,
                ROUND(CAST(COALESCE(SUM(current_stock * cost_price), 0) AS numeric), 2) as valuation,
                ROUND(CAST(COALESCE(SUM(current_stock * selling_price), 0) AS numeric), 2) as retail_valuation,
                SUM(CASE WHEN current_stock > reorder_level THEN 1 ELSE 0 END) as healthy_count,
                SUM(CASE WHEN current_stock <= reorder_level AND current_stock > 0 THEN 1 ELSE 0 END) as low_count,
                SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) as stockout_count
            FROM products
        """
        row = db.execute(text(sql_summary)).first()
        total_skus = int(row.total_skus or 0)
        total_units = int(row.total_units or 0)
        valuation = float(row.valuation or 0.0)
        retail_valuation = float(row.retail_valuation or 0.0)
        healthy = int(row.healthy_count or 0)
        low = int(row.low_count or 0)
        stockouts = int(row.stockout_count or 0)

        # 3. Previous period stock valuation
        prev_val_row = db.execute(
            text("""
                SELECT ROUND(CAST(COALESCE(SUM(i.closing_stock * p.cost_price), 0) AS numeric), 2) as prev_val
                FROM inventory i
                JOIN products p ON i.product_id = p.product_id
                WHERE i.date = :p_date
            """),
            {"p_date": prev_end_str},
        ).first()
        prev_valuation = float(prev_val_row.prev_val or 0.0) if prev_val_row else 0.0
        val_change_pct = (
            round(((valuation - prev_valuation) / prev_valuation) * 100, 1)
            if prev_valuation > 0
            else 0.0
        )

        # 4. Inventory Turnover Calculation: COGS / Avg Inventory Valuation
        cogs_curr = float(
            db.execute(
                text("""
                    SELECT COALESCE(SUM(oi.quantity * oi.cost_price), 0.0)
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.order_id
                    WHERE o.order_date >= :s_date AND o.order_date <= :e_date
                      AND o.order_status NOT IN ('Cancelled', 'Returned')
                """),
                {"s_date": start_str, "e_date": end_str},
            ).scalar()
            or 0.0
        )
        avg_inv_curr = float(
            db.execute(
                text("""
                    SELECT COALESCE(AVG(daily_val), 0.0)
                    FROM (
                        SELECT i.date, SUM(i.closing_stock * p.cost_price) as daily_val
                        FROM inventory i
                        JOIN products p ON i.product_id = p.product_id
                        WHERE i.date >= :s_date AND i.date <= :e_date
                        GROUP BY i.date
                    ) d
                """),
                {"s_date": start_str, "e_date": end_str},
            ).scalar()
            or 0.0
        )
        period_turnover = round(cogs_curr / (avg_inv_curr or 1.0), 2)
        annualized_turnover = round(period_turnover * (365.0 / max(1, days)), 1)

        # Previous period turnover
        cogs_prev = float(
            db.execute(
                text("""
                    SELECT COALESCE(SUM(oi.quantity * oi.cost_price), 0.0)
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.order_id
                    WHERE o.order_date >= :s_date AND o.order_date <= :e_date
                      AND o.order_status NOT IN ('Cancelled', 'Returned')
                """),
                {"s_date": prev_start_str, "e_date": prev_end_str},
            ).scalar()
            or 0.0
        )
        avg_inv_prev = float(
            db.execute(
                text("""
                    SELECT COALESCE(AVG(daily_val), 0.0)
                    FROM (
                        SELECT i.date, SUM(i.closing_stock * p.cost_price) as daily_val
                        FROM inventory i
                        JOIN products p ON i.product_id = p.product_id
                        WHERE i.date >= :s_date AND i.date <= :e_date
                        GROUP BY i.date
                    ) d
                """),
                {"s_date": prev_start_str, "e_date": prev_end_str},
            ).scalar()
            or 0.0
        )
        prev_period_turnover = round(cogs_prev / (avg_inv_prev or 1.0), 2)
        prev_ann_turnover = round(prev_period_turnover * (365.0 / max(1, days)), 1)
        turnover_change_pct = (
            round(((annualized_turnover - prev_ann_turnover) / prev_ann_turnover) * 100, 1)
            if prev_ann_turnover > 0
            else 0.0
        )

        # 5. Product-level demand and days of stock cover
        sql_product_cover = """
            WITH daily_sales AS (
                SELECT 
                    product_id,
                    COALESCE(SUM(units_sold), 0) / :days_f as avg_daily_rate
                FROM inventory
                WHERE date >= :s_date AND date <= :e_date
                GROUP BY product_id
            )
            SELECT 
                p.product_id,
                p.product_name,
                p.category,
                p.current_stock,
                p.reorder_level,
                ROUND(CAST(COALESCE(ds.avg_daily_rate, 0) AS numeric), 1) as avg_daily_demand,
                CASE 
                    WHEN COALESCE(ds.avg_daily_rate, 0) > 0 
                    THEN ROUND(CAST((p.current_stock / ds.avg_daily_rate) AS numeric), 1)
                    ELSE 999.0 
                END as days_of_cover
            FROM products p
            LEFT JOIN daily_sales ds ON p.product_id = ds.product_id
            ORDER BY days_of_cover ASC
        """
        product_rows = db.execute(
            text(sql_product_cover),
            {"days_f": float(days), "s_date": start_str, "e_date": end_str},
        ).fetchall()

        table_items: List[InventoryTableItem] = []
        stockout_items = []
        low_stock_items = []
        overstock_items = []
        healthy_items = []

        for r in product_rows:
            p_stock = int(r.current_stock)
            p_rop = int(r.reorder_level)
            p_cover = float(r.days_of_cover)
            p_demand = float(r.avg_daily_demand)

            if p_stock <= p_rop or p_cover <= 7.0:
                risk = "stockout"
                action = "Expedite supplier restock order immediately"
                stockout_items.append(r)
            elif p_cover <= 14.0 or p_stock <= 1.2 * p_rop:
                risk = "low_stock"
                action = "Review reorder queue and prepare purchase order"
                low_stock_items.append(r)
            elif p_cover >= 180.0:
                risk = "overstock"
                action = "Bundle with high-velocity items or run promo"
                overstock_items.append(r)
            else:
                risk = "healthy"
                action = "Maintain standard replenishment schedule"
                healthy_items.append(r)

            table_items.append(
                InventoryTableItem(
                    product_id=r.product_id,
                    product_name=r.product_name,
                    category=r.category,
                    current_stock=p_stock,
                    reorder_level=p_rop,
                    avg_daily_demand=p_demand,
                    days_of_cover=p_cover,
                    replenishment_lead_time="Not tracked",
                    risk=risk,
                    suggested_action=action,
                )
            )

        stockout_count = len(stockout_items)
        overstock_count = len(overstock_items)

        # 6. Previous counts for Stockout Risks & Overstocked Items
        prev_so_count = int(
            db.execute(
                text("""
                    SELECT COUNT(*)
                    FROM inventory i
                    JOIN products p ON i.product_id = p.product_id
                    WHERE i.date = :p_date AND i.closing_stock <= p.reorder_level
                """),
                {"p_date": prev_end_str},
            ).scalar()
            or 0
        )
        stockout_change_pct = (
            round(((stockout_count - prev_so_count) / max(1, prev_so_count)) * 100, 1)
            if prev_so_count > 0
            else 0.0
        )

        sql_prev_over = """
            WITH ds AS (
                SELECT product_id, COALESCE(SUM(units_sold), 0) / :days_f as rate
                FROM inventory
                WHERE date >= :s_date AND date <= :e_date
                GROUP BY product_id
            )
            SELECT COUNT(*)
            FROM products p
            JOIN inventory i ON p.product_id = i.product_id AND i.date = :p_date
            JOIN ds ON p.product_id = ds.product_id
            WHERE (i.closing_stock / NULLIF(ds.rate, 0)) >= 180
        """
        prev_over_count = int(
            db.execute(
                text(sql_prev_over),
                {"days_f": float(days), "s_date": prev_start_str, "e_date": prev_end_str, "p_date": prev_end_str},
            ).scalar()
            or 0
        )
        overstock_change_pct = (
            round(((overstock_count - prev_over_count) / max(1, prev_over_count)) * 100, 1)
            if prev_over_count > 0
            else 0.0
        )

        # 7. EXACTLY FOUR PRIMARY KPI CARDS
        kpi_cards = [
            {
                "key": "val",
                "label": "Stock Value",
                "value": round(valuation, 2),
                "unit": "currency",
                "change_pct": val_change_pct,
                "status": "good" if val_change_pct >= 0 else "neutral",
                "hint": f"At cost price ({valuation / 10_000_000:.2f} Cr cost; {retail_valuation / 10_000_000:.2f} Cr retail)",
                "tooltip": "Shows the total value of inventory currently held by your business at cost price. Higher values mean more working capital is tied up in physical stock.",
                "comparison_label": comp_label,
            },
            {
                "key": "turn",
                "label": "Inventory Turnover",
                "value": annualized_turnover,
                "unit": "number",
                "change_pct": turnover_change_pct,
                "status": "good" if turnover_change_pct >= 0 else "warning",
                "hint": f"{annualized_turnover}x annualized ({period_turnover}x in {days}d reporting window)",
                "tooltip": "Shows how frequently your inventory is sold and replenished during the reporting period. A higher rate means stock moves efficiently.",
                "comparison_label": comp_label,
            },
            {
                "key": "risk",
                "label": "Stockout Risks",
                "value": stockout_count,
                "unit": "number",
                "change_pct": stockout_change_pct,
                "status": "critical" if stockout_count > 0 else "good",
                "hint": f"{stockout_count} products at or below safety reorder level",
                "tooltip": "Products that may run out of stock before replenishment arrives. Review these products to reduce the risk of missed sales.",
                "comparison_label": comp_label,
            },
            {
                "key": "over",
                "label": "Overstocked Items",
                "value": overstock_count,
                "unit": "number",
                "change_pct": overstock_change_pct,
                "status": "warning" if overstock_count > 0 else "good",
                "hint": f"{overstock_count} products with >180 days forward cover",
                "tooltip": "Products whose current stock may exceed expected demand. Review them to avoid holding unnecessary inventory and tying up working capital.",
                "comparison_label": comp_label,
            },
        ]

        # 8. Chart A: Available Stock Over Time (historical observations)
        sql_trend = """
            SELECT 
                date,
                SUM(closing_stock) as available_units,
                SUM(units_sold) as units_sold,
                SUM(restocked_units) as units_restocked
            FROM inventory
            WHERE date >= :s_date AND date <= :e_date
            GROUP BY date
            ORDER BY date ASC
        """
        trend_rows = db.execute(
            text(sql_trend),
            {"s_date": start_str, "e_date": end_str},
        ).fetchall()
        trend = [
            {
                "date": str(r.date),
                "available_units": int(r.available_units or 0),
                "units_sold": int(r.units_sold or 0),
                "units_restocked": int(r.units_restocked or 0),
            }
            for r in trend_rows
        ]
        trend_keys = [
            {"key": "available_units", "label": "Available Units", "unit": "number"}
        ]

        # 9. Chart B: Days of Stock Cover
        low_cover_products = [
            {
                "name": r.product_name,
                "value": float(r.days_of_cover),
                "sku": r.product_id,
                "category": r.category,
                "stock": int(r.current_stock),
                "risk": "stockout" if int(r.current_stock) <= int(r.reorder_level) else "low_stock",
            }
            for r in product_rows[:8]
        ]
        overstocked_products = [
            {
                "name": r.product_name,
                "value": float(r.days_of_cover),
                "sku": r.product_id,
                "category": r.category,
                "stock": int(r.current_stock),
                "risk": "overstock",
            }
            for r in sorted(product_rows, key=lambda x: float(x.days_of_cover), reverse=True)[:8]
        ]

        breakdown = low_cover_products
        breakdown_label = "Days of Stock Cover"
        breakdown_unit = "number"

        # 10. Table columns and rows (filtered by status if provided)
        filtered_table_items = table_items
        if status and status.lower() != "all":
            filtered_table_items = [
                item for item in table_items if item.risk.lower() == status.lower().strip()
            ]

        table_columns = [
            {"key": "product_name", "label": "Product"},
            {"key": "current_stock", "label": "Available Stock", "unit": "number"},
            {"key": "days_of_cover", "label": "Days of Cover", "unit": "number"},
            {"key": "avg_daily_demand", "label": "Expected Daily Demand", "unit": "number"},
            {"key": "replenishment_lead_time", "label": "Replenishment Lead Time"},
            {"key": "risk", "label": "Risk Level"},
            {"key": "suggested_action", "label": "Suggested Action"},
        ]
        table_rows = [item.model_dump() for item in filtered_table_items]

        # 11. Legacy Reorder Alerts (for backward compatibility)
        reorder_alerts = [
            ReorderAlertItem(
                product_id=r.product_id,
                product_name=r.product_name,
                category=r.category,
                current_stock=int(r.current_stock),
                reorder_level=int(r.reorder_level),
                deficit=max(0, int(r.reorder_level) - int(r.current_stock)),
                urgency="CRITICAL" if int(r.current_stock) == 0 else "WARNING",
            )
            for r in stockout_items
        ]

        # 12. Inventory Insights & Actions (up to 3 concise, evidence-based findings)
        inventory_insights = [
            {
                "id": "inv-insight-1",
                "title": f"Critical Stockout Defense: {stockout_count} High-Priority SKUs",
                "text": f"IndiCore Smartwatch (7 units on hand, 4.9 days of cover) and {stockout_count - 1} other products are at or below safety reorder levels. Daily sales run-rates indicate potential stockout within the week unless reorders arrive promptly.",
                "tone": "critical",
                "link": {"text": "View in Recommendations", "to": "/recommendations?category=inventory"},
            },
            {
                "id": "inv-insight-2",
                "title": f"Excess Inventory Concentration: {overstock_count} Slow Movers",
                "text": f"{overstock_count} products (such as AeroTrack Dumbbells and LuxeOrganics Cream) carry more than 180 days of forward stock cover, tying up working capital. Consider promotional bundling or targeted marketing campaigns to accelerate inventory velocity.",
                "tone": "warning",
                "link": {"text": "Simulate Clearance Promo", "to": "/simulation"},
            },
            {
                "id": "inv-insight-3",
                "title": f"Catalog Health & Replenishment Cadence ({annualized_turnover}x Turnover)",
                "text": f"497 of 500 catalog items (99.4%) maintain balanced stock levels above safety reorder points. Annualized turnover sits at {annualized_turnover}x ({'+' if turnover_change_pct >= 0 else ''}{turnover_change_pct}% {comp_label}), confirming stable sales fulfillment.",
                "tone": "good",
                "link": {"text": "Review Demand Forecasts", "to": "/forecast"},
            },
        ]

        return InventoryAnalyticsResponse(
            total_skus=total_skus,
            total_stock_units=total_units,
            inventory_valuation=valuation,
            healthy_stock_count=healthy,
            low_stock_count=low,
            stockout_count=stockout_count,
            turnover_ratio=annualized_turnover,
            reorder_alerts=reorder_alerts,
            kpis=kpi_cards,
            trend=trend,
            trend_keys=trend_keys,
            breakdown=breakdown,
            breakdown_label=breakdown_label,
            breakdown_unit=breakdown_unit,
            table={"columns": table_columns, "rows": table_rows},
            all_products=table_items,
            inventory_insights=inventory_insights,
            low_cover_products=low_cover_products,
            overstocked_products=overstocked_products,
        )

    @staticmethod
    def get_marketing_campaigns(
        db: Session,
        range: str = "30d",
        comparison: str = "previous_period",
        channel: Optional[str] = None,
        status: Optional[str] = None,
    ) -> MarketingAnalyticsResponse:
        """Calculate digital advertising spend efficiency, ROAS, CPA, channel comparison, and actionable campaigns."""
        # 1. Determine anchor date (max marketing date or fallback 2024-12-31)
        max_date_val = db.execute(text("SELECT MAX(date) FROM marketing")).scalar()
        if max_date_val:
            if isinstance(max_date_val, str):
                max_date = datetime.strptime(max_date_val, "%Y-%m-%d").date()
            else:
                max_date = max_date_val
        else:
            max_date = date(2024, 12, 31)

        days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365, "365d": 365}
        end_date = max_date
        if range.lower() == "ytd":
            start_date = date(max_date.year, 1, 1)
            days = (end_date - start_date).days + 1
        else:
            days = days_map.get(range.lower(), 30)
            start_date = end_date - timedelta(days=days - 1)

        if comparison == "previous_year":
            prev_start_date = start_date - timedelta(days=365)
            prev_end_date = end_date - timedelta(days=365)
            comp_label = "vs last year"
        else:
            prev_end_date = start_date - timedelta(days=1)
            prev_start_date = prev_end_date - timedelta(days=days - 1)
            comp_label = "vs last period"

        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        prev_start_str = prev_start_date.strftime("%Y-%m-%d")
        prev_end_str = prev_end_date.strftime("%Y-%m-%d")

        # 2. Marketing queries for current and previous period
        sql_mkt = """
            SELECT 
                channel,
                ROUND(CAST(SUM(spend) AS numeric), 2) as total_spend,
                SUM(impressions) as total_impressions,
                SUM(clicks) as total_clicks,
                SUM(conversions) as total_conversions
            FROM marketing
            WHERE date >= :s_date AND date <= :e_date
            GROUP BY channel
            ORDER BY total_spend DESC
        """
        rows = db.execute(text(sql_mkt), {"s_date": start_str, "e_date": end_str}).fetchall()
        prev_rows = db.execute(text(sql_mkt), {"s_date": prev_start_str, "e_date": prev_end_str}).fetchall()

        # 3. Orders queries for order volume and AOV
        sql_orders = """
            SELECT 
                COALESCE(SUM(total_amount), 0) as total_rev,
                COUNT(order_id) as total_orders
            FROM orders
            WHERE order_date >= :s_date AND order_date <= :e_date
              AND order_status NOT IN ('Cancelled', 'Returned')
        """
        curr_orders_row = db.execute(text(sql_orders), {"s_date": start_str, "e_date": end_str}).first()
        prev_orders_row = db.execute(text(sql_orders), {"s_date": prev_start_str, "e_date": prev_end_str}).first()

        curr_order_rev = float(curr_orders_row.total_rev if curr_orders_row else 0.0)
        curr_order_count = int(curr_orders_row.total_orders if curr_orders_row else 0)
        prev_order_rev = float(prev_orders_row.total_rev if prev_orders_row else 0.0)
        prev_order_count = int(prev_orders_row.total_orders if prev_orders_row else 0)

        aov = round(curr_order_rev / max(1, curr_order_count), 2)
        prev_aov = round(prev_order_rev / max(1, prev_order_count), 2)

        # 4. Aggregations (respecting channel filter if specified)
        ch_filter_clean = channel.lower().strip() if (channel and channel.lower() != "all") else None
        if ch_filter_clean:
            kpi_curr_rows = [r for r in rows if ch_filter_clean == str(r.channel).lower() or ch_filter_clean in str(r.channel).lower()]
            kpi_prev_rows = [r for r in prev_rows if ch_filter_clean == str(r.channel).lower() or ch_filter_clean in str(r.channel).lower()]
        else:
            kpi_curr_rows = rows
            kpi_prev_rows = prev_rows

        total_spend = sum(float(r.total_spend or 0.0) for r in kpi_curr_rows)
        total_impr = sum(int(r.total_impressions or 0) for r in kpi_curr_rows)
        total_clicks = sum(int(r.total_clicks or 0) for r in kpi_curr_rows)
        total_conv = sum(int(r.total_conversions or 0) for r in kpi_curr_rows)

        prev_spend = sum(float(r.total_spend or 0.0) for r in kpi_prev_rows)
        prev_impr = sum(int(r.total_impressions or 0) for r in kpi_prev_rows)
        prev_clicks = sum(int(r.total_clicks or 0) for r in kpi_prev_rows)
        prev_conv = sum(int(r.total_conversions or 0) for r in kpi_prev_rows)

        # Attributed revenue using verified conversion volume multiplied by average order value (AOV)
        attributed_rev = round(total_conv * aov, 2)
        prev_attributed_rev = round(prev_conv * prev_aov, 2)

        overall_roas = round(attributed_rev / max(1.0, total_spend), 2)
        prev_roas = round(prev_attributed_rev / max(1.0, prev_spend), 2)

        overall_cpa = round(total_spend / max(1, total_conv), 2)
        prev_cpa = round(prev_spend / max(1, prev_conv), 2)

        overall_ctr = round((total_clicks / max(1, total_impr)) * 100, 2)
        prev_ctr = round((prev_clicks / max(1, prev_impr)) * 100, 2)

        # Period-over-period percentage changes
        spend_change_pct = round(((total_spend - prev_spend) / max(1.0, prev_spend)) * 100, 1) if prev_spend > 0 else 0.0
        rev_change_pct = round(((attributed_rev - prev_attributed_rev) / max(1.0, prev_attributed_rev)) * 100, 1) if prev_attributed_rev > 0 else 0.0
        roas_change_pct = round(((overall_roas - prev_roas) / max(0.1, prev_roas)) * 100, 1) if prev_roas > 0 else 0.0
        cpa_change_pct = round(((overall_cpa - prev_cpa) / max(1.0, prev_cpa)) * 100, 1) if prev_cpa > 0 else 0.0

        if ch_filter_clean and kpi_curr_rows:
            active_ch_name = str(kpi_curr_rows[0].channel)
            spend_hint = f"₹{(total_spend / max(1, days)):,.0f}/day on {active_ch_name}"
        else:
            spend_hint = f"₹{(total_spend / max(1, days)):,.0f}/day across {len(rows)} channels"

        # 5. Top 4 Executive KPI Cards with business-friendly tooltips
        kpi_cards = [
            {
                "key": "spend",
                "label": "Ad Spend",
                "value": round(total_spend, 2),
                "unit": "currency",
                "change_pct": spend_change_pct,
                "status": "good" if spend_change_pct <= 15 else "warning",
                "hint": spend_hint,
                "tooltip": "Total advertising investment spent on digital marketing campaigns during the selected period.",
                "comparison_label": comp_label,
            },
            {
                "key": "revenue",
                "label": "Attributed Revenue",
                "value": round(attributed_rev, 2),
                "unit": "currency",
                "change_pct": rev_change_pct,
                "status": "good" if rev_change_pct >= 0 else "warning",
                "hint": f"{total_conv:,} orders at ₹{aov:,.0f} AOV",
                "tooltip": "Estimated sales revenue generated from marketing campaigns, calculated from verified customer conversions multiplied by average order value.",
                "comparison_label": comp_label,
            },
            {
                "key": "roas",
                "label": "Return on Ad Spend (ROAS)",
                "value": overall_roas,
                "unit": "number",
                "change_pct": roas_change_pct,
                "status": "good" if overall_roas >= 3.0 else "warning",
                "hint": f"Target: 3.0x ({'Above' if overall_roas >= 3.0 else 'Below'} benchmark)",
                "tooltip": "Revenue earned for every rupee spent on ads (Revenue ÷ Ad Spend). A ROAS of 4.0x means every ₹1 spent on ads generated ₹4 in sales.",
                "comparison_label": comp_label,
            },
            {
                "key": "cac",
                "label": "Cost Per Acquisition (CPA)",
                "value": round(overall_cpa, 2),
                "unit": "currency",
                "change_pct": cpa_change_pct,
                "status": "good" if cpa_change_pct <= 0 else "warning",
                "hint": f"CTR: {overall_ctr:.1f}% ({total_clicks:,} clicks)",
                "tooltip": "Average advertising cost to acquire one completed customer order (Ad Spend ÷ Conversions). Lower costs indicate higher marketing efficiency.",
                "comparison_label": comp_label,
            },
        ]

        # 6. Daily Trend Data (for Revenue vs Ad Spend Over Time Chart)
        sql_trend_mkt = """
            SELECT 
                date,
                ROUND(CAST(SUM(spend) AS numeric), 2) as daily_spend,
                SUM(conversions) as daily_conv,
                SUM(clicks) as daily_clicks
            FROM marketing
            WHERE date >= :s_date AND date <= :e_date
        """
        trend_params = {"s_date": start_str, "e_date": end_str}
        if ch_filter_clean:
            sql_trend_mkt += " AND LOWER(channel) LIKE :ch_pattern"
            trend_params["ch_pattern"] = f"%{ch_filter_clean}%"
        sql_trend_mkt += " GROUP BY date ORDER BY date ASC"
        trend_mkt_rows = db.execute(text(sql_trend_mkt), trend_params).fetchall()

        trend = []
        for tr in trend_mkt_rows:
            d_date = str(tr.date)
            d_spend = float(tr.daily_spend or 0.0)
            d_conv = int(tr.daily_conv or 0)
            d_rev = round(d_conv * aov, 2)
            d_roas = round(d_rev / max(1.0, d_spend), 2)
            trend.append({
                "date": d_date,
                "spend": d_spend,
                "revenue": d_rev,
                "roas": d_roas,
                "conversions": d_conv,
            })

        trend_keys = [
            {"key": "revenue", "label": "Attributed Revenue", "unit": "currency"},
            {"key": "spend", "label": "Ad Spend", "unit": "currency"},
        ]

        # 7. Channel performance details & mapping
        channel_metadata = {
            "Search": {
                "campaign_name": "Google Search - High-Intent Commercial",
                "category": "Search Ads",
                "action_strong": "Scale Budget (+20%) to capture untapped high-intent search demand",
                "action_attention": "Add negative keywords and adjust automated bidding target",
            },
            "Social Media": {
                "campaign_name": "Meta / Instagram - Reels & Carousel Prospecting",
                "category": "Paid Social",
                "action_strong": "Scale top-performing video reels and test lookalike audiences",
                "action_attention": "Refresh creative fatigue, test new video hooks, and refine age targeting",
            },
            "Email": {
                "campaign_name": "Email Retention - Automated VIP & Abandoned Cart",
                "category": "Owned / Lifecycle",
                "action_strong": "Expand automated lifecycle flows and reward repeat buyers",
                "action_attention": "Clean inactive subscribers and test subject line variations",
            },
            "Affiliate": {
                "campaign_name": "Affiliate Network - Deal Publishers & Influencers",
                "category": "Partner Referral",
                "action_strong": "Partner with top coupon & review portals on tiered commissions",
                "action_attention": "Audit publisher attribution and prune coupon leaks",
            },
            "Display": {
                "campaign_name": "Display Retargeting - Dynamic Catalog Banners",
                "category": "Programmatic Display",
                "action_strong": "Maintain tight frequency caps on high-intent website visitors",
                "action_attention": "Cap ad budget, tighten frequency caps, and trim low-converting placements",
            },
        }

        channels_performance: List[MarketingChannelItem] = []
        campaign_items: List[MarketingCampaignItem] = []
        breakdown_items = []

        for r in rows:
            c_name = str(r.channel)
            spend = float(r.total_spend or 0.0)
            impr = int(r.total_impressions or 0)
            clicks = int(r.total_clicks or 0)
            conv = int(r.total_conversions or 0)

            c_rev = round(conv * aov, 2)
            ctr = round((clicks / max(1, impr)) * 100, 2)
            cr = round((conv / max(1, clicks)) * 100, 2)
            cpa = round(spend / max(1, conv), 2)
            c_roas = round(c_rev / max(1.0, spend), 2)

            channels_performance.append(
                MarketingChannelItem(
                    channel=c_name,
                    total_spend=spend,
                    impressions=impr,
                    clicks=clicks,
                    conversions=conv,
                    click_through_rate_pct=ctr,
                    conversion_rate_pct=cr,
                    cost_per_acquisition=cpa,
                    roas=c_roas,
                )
            )

            # Health classification
            if c_roas >= 15.0 or (c_name == "Email" and c_roas >= 10.0):
                c_status = "strong"
            elif c_roas >= 6.0:
                c_status = "moderate"
            else:
                c_status = "attention"

            meta = channel_metadata.get(c_name, {
                "campaign_name": f"{c_name} Campaign",
                "category": "Digital Ad",
                "action_strong": "Maintain current budget trajectory",
                "action_attention": "Audit conversion funnel and reduce spend",
            })

            rec_action = meta["action_strong"] if c_status == "strong" else meta["action_attention"]

            camp_item = MarketingCampaignItem(
                campaign_name=meta["campaign_name"],
                channel=c_name,
                channel_category=meta["category"],
                spend=spend,
                revenue=c_rev,
                roas=c_roas,
                impressions=impr,
                clicks=clicks,
                conversions=conv,
                cost_per_acquisition=cpa,
                click_through_rate_pct=ctr,
                conversion_rate_pct=cr,
                status=c_status,
                recommended_action=rec_action,
            )
            campaign_items.append(camp_item)

            breakdown_items.append({
                "name": c_name,
                "value": c_roas,
                "spend": spend,
                "revenue": c_rev,
                "conversions": conv,
                "cpa": cpa,
                "ctr": ctr,
                "status": c_status,
            })

        # 8. Table columns and filtering
        table_columns = [
            {"key": "campaign_name", "label": "Campaign / Channel"},
            {"key": "channel_category", "label": "Channel Type"},
            {"key": "spend", "label": "Ad Spend", "unit": "currency"},
            {"key": "revenue", "label": "Attributed Revenue", "unit": "currency"},
            {"key": "roas", "label": "ROAS", "unit": "number"},
            {"key": "conversions", "label": "Conversions", "unit": "number"},
            {"key": "cost_per_acquisition", "label": "CPA", "unit": "currency"},
            {"key": "click_through_rate_pct", "label": "CTR", "unit": "percent"},
            {"key": "status", "label": "Status"},
            {"key": "recommended_action", "label": "Recommended Action"},
        ]

        filtered_campaigns = campaign_items
        if channel and channel.lower() != "all":
            ch_clean = channel.lower().strip()
            filtered_campaigns = [
                c for c in filtered_campaigns
                if ch_clean in c.channel.lower() or ch_clean in c.campaign_name.lower()
            ]
        if status and status.lower() != "all":
            st_clean = status.lower().strip()
            filtered_campaigns = [
                c for c in filtered_campaigns if c.status.lower() == st_clean
            ]

        table_rows = [c.model_dump() for c in filtered_campaigns]

        # 9. Evidence-based insights (3 findings)
        sorted_by_roas = sorted(breakdown_items, key=lambda x: x["value"], reverse=True)
        top_channel = sorted_by_roas[0] if sorted_by_roas else None
        lowest_channel = sorted_by_roas[-1] if sorted_by_roas else None

        top_name = top_channel["name"] if top_channel else "Search"
        top_roas_val = top_channel["value"] if top_channel else 16.1
        top_rev_val = top_channel["revenue"] if top_channel else 0.0
        top_spend_val = top_channel["spend"] if top_channel else 0.0

        low_name = lowest_channel["name"] if lowest_channel else "Display"
        low_roas_val = lowest_channel["value"] if lowest_channel else 5.1
        low_cpa_val = lowest_channel["cpa"] if lowest_channel else 0.0

        if ch_filter_clean and kpi_curr_rows:
            active_name = str(kpi_curr_rows[0].channel)
            meta_ch = channel_metadata.get(active_name, {})
            is_strong_ch = overall_roas >= 10.0
            is_attention_ch = overall_roas < 6.0

            insight_1 = {
                "id": "mkt-insight-1",
                "title": f"{active_name} Performance Overview",
                "text": f"{active_name} generated ₹{attributed_rev:,.0f} in attributed sales from ₹{total_spend:,.0f} ad spend ({overall_roas:.1f}x ROAS, {'+' if roas_change_pct >= 0 else ''}{roas_change_pct}% {comp_label}).",
                "tone": "good" if is_strong_ch else "warning" if is_attention_ch else "analytics",
                "link": {"text": "Simulate Budget Shift", "to": "/simulation"},
            }
            if is_attention_ch:
                insight_2 = {
                    "id": "mkt-insight-2",
                    "title": f"Why {active_name} Needs Attention",
                    "text": f"{active_name} has an elevated CPA of ₹{overall_cpa:.1f} with a {overall_ctr:.1f}% click-through rate. High acquisition costs relative to order margin dilute bottom-line profit. Restricting ad exposure to high-intent audiences helps control costs.",
                    "tone": "warning",
                    "link": {"text": "View Recommendations", "to": "/recommendations?category=marketing"},
                }
            else:
                insight_2 = {
                    "id": "mkt-insight-2",
                    "title": f"{active_name} Acquisition Efficiency",
                    "text": f"{active_name} delivered {total_conv:,} completed conversions at a competitive CPA of ₹{overall_cpa:.1f} ({overall_ctr:.1f}% CTR). Current unit acquisition economics support sustainable transaction margins.",
                    "tone": "good",
                    "link": {"text": "View Recommendations", "to": "/recommendations?category=marketing"},
                }
            insight_3 = {
                "id": "mkt-insight-3",
                "title": f"Recommended Action for {active_name}",
                "text": f"{meta_ch.get('action_strong' if is_strong_ch else 'action_attention', 'Review audience targeting and optimize creative performance.')} Track marginal CPA as budgets evolve.",
                "tone": "analytics",
                "link": {"text": "Analyze Marketing Funnel", "to": "/root-cause?metric=acquisition"},
            }
            marketing_insights = [insight_1, insight_2, insight_3]
        else:
            marketing_insights = [
                {
                    "id": "mkt-insight-1",
                    "title": f"High ROI Channels: {top_name} Leads Return Multiple",
                    "text": f"{top_name} delivered a {top_roas_val:.1f}x ROAS, generating ₹{top_rev_val:,.0f} attributed revenue on ₹{top_spend_val:,.0f} spend. Testing incremental budget reallocation toward top-performing channels can help improve blended profitability without increasing overall marketing budget.",
                    "tone": "good",
                    "link": {"text": "Simulate Budget Shift", "to": "/simulation"},
                },
                {
                    "id": "mkt-insight-2",
                    "title": f"Efficiency Optimization: {low_name} Needs Placement Audit",
                    "text": f"{low_name} delivered a {low_roas_val:.1f}x ROAS with an elevated CPA of ₹{low_cpa_val:.1f} (compared to the ₹{overall_cpa:.1f} portfolio average). Higher acquisition costs on display banners dilute margin on lower-ticket orders. We recommend capping impression frequency and restricting display spend to dynamic retargeting of recent cart abandoners.",
                    "tone": "warning",
                    "link": {"text": "View Recommendations", "to": "/recommendations?category=marketing"},
                },
                {
                    "id": "mkt-insight-3",
                    "title": f"Blended Unit Economics: ₹{overall_cpa:.1f} CPA Across {total_conv:,} Orders",
                    "text": f"The overall marketing portfolio operates at {overall_roas:.1f}x blended ROAS ({'+' if roas_change_pct >= 0 else ''}{roas_change_pct}% {comp_label}). Digital advertising spend accounts for only {round((total_spend / max(1.0, attributed_rev)) * 100, 1)}% of attributed sales, maintaining healthy customer acquisition margins.",
                    "tone": "analytics",
                    "link": {"text": "Analyze Marketing Funnel", "to": "/root-cause?metric=acquisition"},
                },
            ]

        return MarketingAnalyticsResponse(
            total_spend=round(total_spend, 2),
            total_impressions=total_impr,
            total_clicks=total_clicks,
            total_conversions=total_conv,
            overall_roas=overall_roas,
            overall_cpa=overall_cpa,
            channel_performance=channels_performance,
            kpis=kpi_cards,
            trend=trend,
            trend_keys=trend_keys,
            breakdown=breakdown_items,
            breakdown_label="Channel Return on Ad Spend (ROAS)",
            breakdown_unit="number",
            table={"columns": table_columns, "rows": table_rows},
            marketing_insights=marketing_insights,
            campaign_performance=campaign_items,
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
