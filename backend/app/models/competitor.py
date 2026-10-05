from datetime import date
from typing import Optional
from sqlalchemy import String, Float, Integer, Date, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Competitor(Base):
    __tablename__ = "competitors"

    competitor_id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    product_id: Mapped[str] = mapped_column(String(50), ForeignKey("products.product_id", ondelete="CASCADE"), index=True, nullable=False)
    competitor_name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    competitor_price: Mapped[float] = mapped_column(Float, nullable=False)
    competitor_discount: Mapped[float] = mapped_column(Float, default=0.0)
    competitor_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    availability: Mapped[str] = mapped_column(String(50), default="In Stock")
    competitor_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    review_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="competitor_records")
