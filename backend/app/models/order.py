from datetime import date, datetime
from typing import Optional, List
from sqlalchemy import String, Float, Integer, Date, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Order(Base):
    __tablename__ = "orders"

    order_id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    customer_id: Mapped[str] = mapped_column(String(50), ForeignKey("customers.customer_id", ondelete="CASCADE"), index=True, nullable=False)
    order_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    order_status: Mapped[str] = mapped_column(String(50), default="Completed", index=True)
    channel: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    promotion_id: Mapped[Optional[str]] = mapped_column(String(50), ForeignKey("promotions.promotion_id", ondelete="SET NULL"), nullable=True)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    refund_amount: Mapped[float] = mapped_column(Float, default=0.0)
    return_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="orders")
    promotion: Mapped[Optional["Promotion"]] = relationship("Promotion", back_populates="orders")
    items: Mapped[List["OrderItem"]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    order_item_id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    order_id: Mapped[str] = mapped_column(String(50), ForeignKey("orders.order_id", ondelete="CASCADE"), index=True, nullable=False)
    product_id: Mapped[str] = mapped_column(String(50), ForeignKey("products.product_id", ondelete="CASCADE"), index=True, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    cost_price: Mapped[float] = mapped_column(Float, nullable=False)
    discount_pct: Mapped[float] = mapped_column(Float, default=0.0)
    final_price: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="order_items")
