"""Test suite for InsightDI Entity Services & Overview APIs"""
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_overview_summary_endpoint():
    start = time.time()
    response = client.get("/api/v1/overview/summary")
    duration = time.time() - start

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    summary = data["data"]

    # Verify real numbers computed from synthetic data
    assert summary["total_orders"] >= 100000
    assert summary["total_customers"] >= 5000
    assert summary["total_products"] >= 500
    assert summary["total_revenue"] > 0
    assert summary["average_order_value"] > 0
    assert summary["total_marketing_spend"] > 0
    assert "return_rate_pct" in summary
    assert duration < 0.5  # verify fast execution


def test_paginated_customers():
    start = time.time()
    response = client.get("/api/v1/entities/customers?page=1&page_size=20")
    duration = time.time() - start

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    res = data["data"]
    assert res["total"] >= 5000
    assert len(res["items"]) == 20
    assert res["page"] == 1
    assert res["total_pages"] >= 250
    assert duration < 0.1  # Response under 100ms


def test_filter_customers_by_city():
    response = client.get("/api/v1/entities/customers?city=Mumbai")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total"] > 0
    for item in data["data"]["items"]:
        assert item["city"] == "Mumbai"


def test_paginated_products():
    response = client.get("/api/v1/entities/products?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    res = data["data"]
    assert res["total"] == 500
    assert len(res["items"]) == 10


def test_paginated_orders():
    response = client.get("/api/v1/entities/orders?page=1&page_size=15")
    assert response.status_code == 200
    data = response.json()
    res = data["data"]
    assert res["total"] == 100000
    assert len(res["items"]) == 15


def test_paginated_inventory():
    response = client.get("/api/v1/entities/inventory?page=1&page_size=25")
    assert response.status_code == 200
    data = response.json()
    res = data["data"]
    assert res["total"] == 183000
    assert len(res["items"]) == 25

    # Filter by specific product
    p_response = client.get("/api/v1/entities/inventory?product_id=PROD0001&page_size=10")
    assert p_response.status_code == 200
    p_data = p_response.json()["data"]
    assert p_data["total"] == 366  # 366 days in year 2024
    for item in p_data["items"]:
        assert item["product_id"] == "PROD0001"


def test_paginated_competitors():
    response = client.get("/api/v1/entities/competitors?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    res = data["data"]
    assert res["total"] == 124500
    assert len(res["items"]) == 10
