from datetime import date
from typing import Optional, List
from sqlalchemy import String, Float, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Promotion(Base):
    __tablename__ = "promotions"

    promotion_id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    promotion_name: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    discount_pct: Mapped[float] = mapped_column(Float, default=0.0)
    promotion_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    festival: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    orders: Mapped[List["Order"]] = relationship("Order", back_populates="promotion")
