from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy import String, Integer, Float, Date, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class KPICache(Base):
    __tablename__ = "kpi_cache"

    kpi_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kpi_key: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    period: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # daily, monthly, yearly
    value: Mapped[float] = mapped_column(Float, nullable=False)
    comparison_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    delta_percentage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class ForecastResult(Base):
    __tablename__ = "forecast_results"

    forecast_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model_name: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # XGBoost, ARIMA, LSTM
    target_metric: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # revenue, demand
    forecast_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    predicted_value: Mapped[float] = mapped_column(Float, nullable=False)
    lower_bound: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    upper_bound: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class RCAResult(Base):
    __tablename__ = "rca_results"

    rca_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kpi_name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    change_pct: Mapped[float] = mapped_column(Float, nullable=False)
    primary_cause: Mapped[str] = mapped_column(String(255), nullable=False)
    contributing_factors: Mapped[dict] = mapped_column(JSON, nullable=False)
    evidence_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class Recommendation(Base):
    __tablename__ = "recommendations"

    rec_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # PRICING, INVENTORY, MARKETING
    priority: Mapped[str] = mapped_column(String(20), index=True, nullable=False)  # HIGH, MEDIUM, LOW
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    recommendation_text: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    expected_impact: Mapped[str] = mapped_column(String(255), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.85)
    is_applied: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class SimulationRecord(Base):
    __tablename__ = "simulation_history"

    sim_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scenario_name: Mapped[str] = mapped_column(String(100), default="What-If Scenario")
    input_parameters: Mapped[dict] = mapped_column(JSON, nullable=False)
    baseline_metrics: Mapped[dict] = mapped_column(JSON, nullable=False)
    simulated_metrics: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
