"""Test suite for InsightDI Predictive Analytics & Forecasting Engine"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_customer_segmentation():
    response = client.get("/api/v1/forecast/segmentation?k=4")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    res = data["data"]

    assert res["total_customers"] >= 5000
    assert len(res["clusters"]) == 4
    assert res["silhouette_score"] > 0.25

    total_pct = sum(c["percentage"] for c in res["clusters"])
    assert 99.0 <= total_pct <= 101.0  # ~100%

    for c in res["clusters"]:
        assert c["customer_count"] > 0
        assert c["avg_monetary_spend"] > 0
        assert c["persona_name"] in [
            "High-Value Champions",
            "Loyal Regulars",
            "Occasional Bargain Hunters",
            "At-Risk Inactive Shoppers",
        ]


def test_revenue_forecast_xgboost():
    response = client.post(
        "/api/v1/forecast/revenue",
        json={"horizon_days": 30, "model_type": "xgboost"},
    )
    assert response.status_code == 200
    data = response.json()["data"]

    assert data["horizon_days"] == 30
    assert data["model_name"] == "XGBoost Regressor"
    assert len(data["forecast"]) == 30
    assert data["total_projected_revenue"] > 0
    assert len(data["historical_last_30_days"]) == 30

    # Verify bounds consistency
    for pt in data["forecast"]:
        assert pt["upper_bound"] >= pt["predicted_value"]
        assert pt["predicted_value"] >= pt["lower_bound"]

    # Verify holdout evaluation metrics
    eval_metrics = data["evaluation"]
    assert eval_metrics["r2_score"] > 0.35  # Tree models typically achieve >0.50 on this dataset
    assert eval_metrics["mae"] > 0
    assert eval_metrics["relative_error_pct"] < 30.0  # reasonable relative error


def test_revenue_forecast_random_forest():
    response = client.post(
        "/api/v1/forecast/revenue",
        json={"horizon_days": 14, "model_type": "random_forest"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["horizon_days"] == 14
    assert data["model_name"] == "Random Forest Regressor"
    assert len(data["forecast"]) == 14


def test_arima_timeseries_forecast():
    response = client.get("/api/v1/forecast/timeseries?horizon=14")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["horizon_days"] == 14
    assert "ARIMA" in data["model_name"]
    assert len(data["forecast"]) == 14


def test_model_benchmarks():
    response = client.get("/api/v1/forecast/benchmarks")
    assert response.status_code == 200
    data = response.json()["data"]

    assert len(data["benchmarks"]) == 3  # XGBoost, RF, ARIMA
    assert data["recommended_model"] in ["XGBoost Regressor", "Random Forest Regressor"]
    assert len(data["evaluation_notes"]) > 10
