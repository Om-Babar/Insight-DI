from datetime import date
from typing import Optional, List
from sqlalchemy import String, Date, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Customer(Base):
    __tablename__ = "customers"

    customer_id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    age_group: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    customer_segment: Mapped[Optional[str]] = mapped_column(String(50), index=True, nullable=True)
    loyalty_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    preferred_payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    registration_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Relationships
    orders: Mapped[List["Order"]] = relationship("Order", back_populates="customer", cascade="all, delete-orphan")
