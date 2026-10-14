"""Test suite for InsightDI Competitive Intelligence (CI) Service & APIs."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.competitor_service import ApifyClient, CompetitorMatcher, CompetitorService
from app.db.session import SessionLocal

client = TestClient(app)


def test_ci_intelligence_endpoint():
    """Verify the /intelligence endpoint returns complete CI data with 200 OK."""
    response = client.get("/api/v1/competitors/intelligence?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    res = data["data"]

    # Verify overview metrics
    overview = res["overview"]
    assert overview["products_monitored"] > 0
    assert overview["products_priced_above_count"] >= 0
    assert overview["cheapest_count"] >= 0
    assert overview["competitive_count"] >= 0
    assert overview["competitor_availability_changes_count"] >= 0

    # Verify marketplace sources
    sources = res["sources"]
    assert len(sources) == 2
    platforms = [s["platform"] for s in sources]
    assert "Amazon.in" in platforms
    assert "Flipkart" in platforms

    # Verify products array
    products = res["products"]
    assert len(products) > 0
    p0 = products[0]
    assert "sku" in p0
    assert "name" in p0
    assert "our_price" in p0
    assert p0["position"] in ("cheapest", "competitive", "overpriced")
    assert "price_history" in p0
    assert len(p0["listings"]) > 0

    # Verify alerts and insights
    assert "alerts" in res
    assert "insights" in res
    assert len(res["insights"]) >= 3


def test_ci_benchmark_endpoint_preserved():
    """Ensure existing /benchmark endpoint is preserved and functioning."""
    response = client.get("/api/v1/competitors/benchmark?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "benchmark_items" in data["data"]


def test_ci_trends_endpoint_preserved():
    """Ensure existing /trends endpoint is preserved and functioning."""
    response = client.get("/api/v1/competitors/trends?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "trends" in data["data"]


def test_ci_alerts_endpoint_preserved():
    """Ensure existing /alerts endpoint is preserved and functioning."""
    response = client.get("/api/v1/competitors/alerts")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "alerts" in data["data"]


def test_apify_normalization_valid_item():
    """Test Apify normalization parses valid product data correctly."""
    raw = {
        "title": "NaturalEssence Organic Shampoo 500ml",
        "brand": "NaturalEssence",
        "price": "₹1,799.00",
        "originalPrice": "₹2,199.00",
        "rating": "4.3 out of 5 stars",
        "reviewsCount": 1240,
        "inStock": True,
        "url": "https://www.amazon.in/dp/B00EXAMPLE",
    }
    item = ApifyClient.normalize_item(raw, platform="amazon")
    assert item is not None
    assert item.product_title == "NaturalEssence Organic Shampoo 500ml"
    assert item.brand == "NaturalEssence"
    assert item.price == 1799.00
    assert item.original_price == 2199.00
    assert item.discount_pct > 0
    assert item.rating == 4.3
    assert item.review_count == 1240
    assert item.stock_status == "In Stock"


def test_apify_normalization_rejects_missing_price():
    """Verify that items without price are rejected and NEVER converted to zero."""
    raw_no_price = {
        "title": "Unpriced Product",
        "brand": "TestBrand",
        "rating": 4.5,
    }
    item = ApifyClient.normalize_item(raw_no_price, platform="amazon")
    assert item is None

    raw_zero_price = {
        "title": "Zero Price Product",
        "price": 0.0,
    }
    item_zero = ApifyClient.normalize_item(raw_zero_price, platform="flipkart")
    assert item_zero is None


def test_apify_normalization_stock_statuses():
    """Verify out-of-stock and limited stock are correctly distinguished."""
    raw_oos = {
        "title": "Out of stock item",
        "price": 499.0,
        "stock": "Currently unavailable",
    }
    item = ApifyClient.normalize_item(raw_oos, platform="amazon")
    assert item is not None
    assert item.stock_status == "Out of Stock"

    raw_limited = {
        "title": "Few left item",
        "price": 899.0,
        "stock": "Only 2 left in stock",
    }
    item2 = ApifyClient.normalize_item(raw_limited, platform="amazon")
    assert item2 is not None
    assert item2.stock_status == "Limited Stock"


def test_competitor_matcher_threshold():
    """Verify that matcher rejects ambiguous items below confidence threshold."""
    catalog = [{
        "product_id": "PROD0001",
        "product_name": "NaturalEssence Organic Shampoo",
        "brand": "NaturalEssence",
        "category": "Beauty",
        "selling_price": 1990.0,
    }]
    # Completely unrelated item
    scraped_items = [ApifyClient.normalize_item({
        "title": "Stainless Steel Kitchen Knife Set",
        "price": 899.0,
    }, platform="amazon")]
    valid_items = [i for i in scraped_items if i is not None]
    matches = CompetitorMatcher.match_scraped_to_catalog(valid_items, catalog)
    assert len(matches) == 0  # Should NOT match unrelated item
