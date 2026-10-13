"""Test suite for InsightDI Business Analytics Engine (Sales, Products, Customers, Inventory, Marketing, KPIs)"""
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_sales_trends_monthly():
    start = time.time()
    response = client.get("/api/v1/analytics/sales/trends?group_by=month")
    duration = time.time() - start

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    res = data["data"]

    # 12 months in 2024
    assert len(res["trends"]) == 12
    assert res["total_period_revenue"] > 100_000_000
    assert res["total_period_orders"] >= 100_000
    assert len(res["channel_breakdown"]) >= 1
    assert duration < 1.0  # Fast execution


def test_product_performance():
    response = client.get("/api/v1/analytics/products/performance?limit=10")
    assert response.status_code == 200
    data = response.json()["data"]

    assert len(data["top_performers"]) == 10
    assert len(data["slow_movers"]) == 10
    assert len(data["category_breakdown"]) >= 5

    # Top performer has higher revenue than slow mover
    assert data["top_performers"][0]["revenue"] >= data["slow_movers"][-1]["revenue"]
    for p in data["top_performers"]:
        assert p["gross_profit"] > 0
        assert p["profit_margin_pct"] > 0


def test_customer_demographics():
    response = client.get("/api/v1/analytics/customers/demographics")
    assert response.status_code == 200
    data = response.json()["data"]

    assert len(data["segment_distribution"]) >= 3
    assert len(data["payment_preferences"]) >= 3
    assert len(data["top_states"]) > 0
    assert len(data["top_cities"]) > 0

    # Enhanced Customer Analytics assertions
    assert "kpis" in data and len(data["kpis"]) == 4
    kpi_keys = {k["key"] for k in data["kpis"]}
    assert kpi_keys == {"cust", "new", "repeat", "clv"}
    assert data["kpis"][0]["value"] > 0  # Active customers > 0
    assert data["kpis"][2]["value"] > 0  # Repeat rate > 0

    assert "trend" in data and len(data["trend"]) > 0
    assert "breakdown" in data and len(data["breakdown"]) == 5
    assert "table" in data and len(data["table"]["rows"]) > 0
    assert "customer_insights" in data and len(data["customer_insights"]) == 3

    # Test filtering by segment
    filt_res = client.get("/api/v1/analytics/customers/demographics?range=30d&segment=Champions")
    assert filt_res.status_code == 200
    filt_data = filt_res.json()["data"]
    assert filt_data["kpis"][0]["value"] > 0
    assert filt_data["kpis"][0]["value"] < data["kpis"][0]["value"]  # Filtered count is subset of total


def test_inventory_status():
    response = client.get("/api/v1/analytics/inventory/status?range=30d&comparison=previous_period")
    assert response.status_code == 200
    data = response.json()["data"]

    # Legacy fields backward compatibility
    assert data["total_skus"] == 500
    assert data["total_stock_units"] == 41390
    assert data["inventory_valuation"] > 40_000_000
    assert data["turnover_ratio"] > 0
    assert isinstance(data["reorder_alerts"], list)

    # EXACTLY 4 PRIMARY KPIS
    assert "kpis" in data and len(data["kpis"]) == 4
    kpi_keys = {k["key"] for k in data["kpis"]}
    assert kpi_keys == {"val", "turn", "risk", "over"}

    # Stock Value KPI
    val_kpi = next(k for k in data["kpis"] if k["key"] == "val")
    assert val_kpi["label"] == "Stock Value"
    assert val_kpi["value"] > 40_000_000
    assert "tooltip" in val_kpi and len(val_kpi["tooltip"]) > 10

    # Inventory Turnover KPI
    turn_kpi = next(k for k in data["kpis"] if k["key"] == "turn")
    assert turn_kpi["label"] == "Inventory Turnover"
    assert turn_kpi["value"] > 0
    assert "tooltip" in turn_kpi

    # Stockout Risks KPI
    risk_kpi = next(k for k in data["kpis"] if k["key"] == "risk")
    assert risk_kpi["label"] == "Stockout Risks"
    assert risk_kpi["value"] == 3
    assert risk_kpi["change_pct"] == 50.0  # Increased from 2 to 3
    assert risk_kpi["status"] == "critical"
    assert "tooltip" in risk_kpi

    # Overstocked Items KPI
    over_kpi = next(k for k in data["kpis"] if k["key"] == "over")
    assert over_kpi["label"] == "Overstocked Items"
    assert over_kpi["value"] == 10
    assert over_kpi["change_pct"] == -28.6  # Decreased from 14 to 10
    assert "tooltip" in over_kpi

    # Available Stock Over Time (Chart A)
    assert "trend" in data and len(data["trend"]) == 30
    assert data["trend"][0]["available_units"] > 0
    assert data["trend_keys"][0]["key"] == "available_units"

    # Days of Stock Cover (Chart B)
    assert "breakdown" in data and len(data["breakdown"]) > 0
    assert "low_cover_products" in data and len(data["low_cover_products"]) == 8
    assert "overstocked_products" in data and len(data["overstocked_products"]) == 8

    # Inventory Status & Logistics Alerts Table
    assert "table" in data
    assert len(data["table"]["columns"]) == 7
    assert len(data["table"]["rows"]) == 500
    # Reconciliation check: 3 stockouts and 10 overstocks in table
    table_stockouts = [r for r in data["table"]["rows"] if r["risk"] == "stockout"]
    table_overstocks = [r for r in data["table"]["rows"] if r["risk"] == "overstock"]
    assert len(table_stockouts) == 3
    assert len(table_overstocks) == 10

    # Status filtering test
    filter_res = client.get("/api/v1/analytics/inventory/status?range=30d&status=stockout")
    assert filter_res.status_code == 200
    filter_data = filter_res.json()["data"]
    assert len(filter_data["table"]["rows"]) == 3

    # Inventory Insights & Actions (3 findings)
    assert "inventory_insights" in data and len(data["inventory_insights"]) == 3
    for ins in data["inventory_insights"]:
        assert "title" in ins and "text" in ins and "tone" in ins


def test_marketing_campaigns():
    response = client.get("/api/v1/analytics/marketing/campaigns?range=30d&comparison=previous_period")
    assert response.status_code == 200
    data = response.json()["data"]

    # Legacy fields backward compatibility
    assert data["total_spend"] > 0
    assert data["total_impressions"] > 0
    assert data["total_clicks"] > 0
    assert data["total_conversions"] > 0
    assert data["overall_roas"] > 1.0
    assert len(data["channel_performance"]) >= 3

    # EXACTLY 4 EXECUTIVE KPIS
    assert "kpis" in data and len(data["kpis"]) == 4
    kpi_keys = {k["key"] for k in data["kpis"]}
    assert kpi_keys == {"spend", "revenue", "roas", "cac"}

    spend_kpi = next(k for k in data["kpis"] if k["key"] == "spend")
    assert spend_kpi["label"] == "Ad Spend"
    assert spend_kpi["value"] > 0
    assert "tooltip" in spend_kpi

    rev_kpi = next(k for k in data["kpis"] if k["key"] == "revenue")
    assert rev_kpi["label"] == "Attributed Revenue"
    assert rev_kpi["value"] > 0
    assert "tooltip" in rev_kpi

    roas_kpi = next(k for k in data["kpis"] if k["key"] == "roas")
    assert roas_kpi["label"] == "Return on Ad Spend (ROAS)"
    assert roas_kpi["value"] > 0
    assert "tooltip" in roas_kpi

    cac_kpi = next(k for k in data["kpis"] if k["key"] == "cac")
    assert cac_kpi["label"] == "Cost Per Acquisition (CPA)"
    assert cac_kpi["value"] > 0
    assert "tooltip" in cac_kpi

    # Daily Trend Chart Data
    assert "trend" in data and len(data["trend"]) == 30
    assert data["trend"][0]["spend"] > 0
    assert data["trend"][0]["revenue"] > 0
    assert len(data["trend_keys"]) == 2

    # Channel Performance Breakdown
    assert "breakdown" in data and len(data["breakdown"]) >= 5
    for item in data["breakdown"]:
        assert "name" in item and "value" in item and "spend" in item

    # Campaign Performance Table
    assert "table" in data
    assert len(data["table"]["columns"]) == 10
    assert len(data["table"]["rows"]) >= 5

    # Filter by Channel
    filter_res = client.get("/api/v1/analytics/marketing/campaigns?range=30d&channel=Search")
    assert filter_res.status_code == 200
    filter_data = filter_res.json()["data"]
    assert len(filter_data["table"]["rows"]) == 1
    assert "Search" in filter_data["table"]["rows"][0]["channel"]

    # Filter by Status
    filter_status_res = client.get("/api/v1/analytics/marketing/campaigns?range=30d&status=strong")
    assert filter_status_res.status_code == 200
    filter_status_data = filter_status_res.json()["data"]
    assert len(filter_status_data["table"]["rows"]) >= 1
    for r in filter_status_data["table"]["rows"]:
        assert r["status"] == "strong"

    # Evidence-based Marketing Insights (3 cards)
    assert "marketing_insights" in data and len(data["marketing_insights"]) == 3
    for ins in data["marketing_insights"]:
        assert "title" in ins and "text" in ins and "tone" in ins


def test_kpis_overview():
    response = client.get("/api/v1/analytics/kpis/overview")
    assert response.status_code == 200
    data = response.json()["data"]

    cards = {c["kpi_key"]: c for c in data["cards"]}
    assert "revenue" in cards
    assert "orders" in cards
    assert "gross_profit" in cards
    assert "aov" in cards
    assert "customers" in cards
    assert "roas" in cards
    assert cards["revenue"]["current_value"] > 0
