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
    response = client.get("/api/v1/analytics/inventory/status")
    assert response.status_code == 200
    data = response.json()["data"]

    assert data["total_skus"] == 500
    assert data["total_stock_units"] > 0
    assert data["inventory_valuation"] > 0
    assert data["turnover_ratio"] > 0
    assert isinstance(data["reorder_alerts"], list)


def test_marketing_campaigns():
    response = client.get("/api/v1/analytics/marketing/campaigns")
    assert response.status_code == 200
    data = response.json()["data"]

    assert data["total_spend"] > 0
    assert data["total_impressions"] > 0
    assert data["total_clicks"] > 0
    assert data["total_conversions"] > 0
    assert data["overall_roas"] > 1.0
    assert len(data["channel_performance"]) >= 3


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
