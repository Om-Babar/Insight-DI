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
