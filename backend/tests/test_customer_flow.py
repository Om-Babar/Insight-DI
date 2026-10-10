"""Verification script for InsightDI Business Analytics -> Customers section."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_customer_analytics_complete_flow():
    # 1. Test default 30d period
    res = client.get("/api/v1/analytics/customers/demographics?range=30d&comparison=previous_period")
    assert res.status_code == 200
    data = res.json()["data"]

    # 4 KPI cards
    assert len(data["kpis"]) == 4
    kpis = {k["key"]: k for k in data["kpis"]}
    assert "cust" in kpis and kpis["cust"]["value"] == 3960
    assert "new" in kpis
    assert "repeat" in kpis and kpis["repeat"]["value"] == 63.8 and kpis["repeat"]["is_pp"] is True
    assert "clv" in kpis and kpis["clv"]["value"] > 0
    for k in data["kpis"]:
        assert "tooltip" in k and len(k["tooltip"]) > 10
        assert "comparison_label" in k

    # Trend chart data
    assert len(data["trend"]) == 30
    for pt in data["trend"]:
        assert "date" in pt
        assert "new" in pt
        assert "returning" in pt

    # Segments breakdown
    assert len(data["breakdown"]) == 5
    seg_names = {b["name"] for b in data["breakdown"]}
    assert seg_names == {"Champions", "Loyal", "Potential", "At Risk", "Lost"}
    for b in data["breakdown"]:
        assert b["value"] > 0
        assert "revenue" in b
        assert "revenue_share_pct" in b
        assert "aov" in b
        assert "definition" in b

    # Geographic performance table
    assert len(data["table"]["rows"]) >= 30
    for r in data["table"]["rows"]:
        assert "city" in r
        assert "state" in r
        assert "customers" in r
        assert "orders" in r
        assert "revenue" in r
        assert "rev_per_customer" in r
        assert "growth_pct" in r

    # Dynamic Customer Insights
    assert len(data["customer_insights"]) == 3
    for ins in data["customer_insights"]:
        assert "title" in ins
        assert "text" in ins
        assert "tone" in ins
        assert "link" in ins

    # 2. Test segment filtering (Champions)
    res_champ = client.get("/api/v1/analytics/customers/demographics?range=30d&segment=Champions")
    assert res_champ.status_code == 200
    champ_data = res_champ.json()["data"]
    assert champ_data["kpis"][0]["value"] == 394
    assert champ_data["kpis"][0]["value"] < data["kpis"][0]["value"]

    # 3. Test previous_year comparison & 90d range
    res_90d = client.get("/api/v1/analytics/customers/demographics?range=90d&comparison=previous_year")
    assert res_90d.status_code == 200
    data_90d = res_90d.json()["data"]
    assert data_90d["kpis"][0]["comparison_label"] == "vs last year"
    assert len(data_90d["trend"]) == 90
