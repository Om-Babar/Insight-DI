from typing import Optional, List
from sqlalchemy import String, Float, Integer, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Product(Base):
    __tablename__ = "products"

    product_id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    product_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    cost_price: Mapped[float] = mapped_column(Float, nullable=False)
    selling_price: Mapped[float] = mapped_column(Float, nullable=False)
    current_stock: Mapped[int] = mapped_column(Integer, default=0)
    reorder_level: Mapped[int] = mapped_column(Integer, default=10)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    order_items: Mapped[List["OrderItem"]] = relationship("OrderItem", back_populates="product")
    inventory_records: Mapped[List["Inventory"]] = relationship("Inventory", back_populates="product")
    competitor_records: Mapped[List["Competitor"]] = relationship("Competitor", back_populates="product")
