from datetime import date
from sqlalchemy import String, Integer, Boolean, Date, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Inventory(Base):
    __tablename__ = "inventory"

    inventory_id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    product_id: Mapped[str] = mapped_column(String(50), ForeignKey("products.product_id", ondelete="CASCADE"), index=True, nullable=False)
    date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    opening_stock: Mapped[int] = mapped_column(Integer, default=0)
    units_sold: Mapped[int] = mapped_column(Integer, default=0)
    restocked_units: Mapped[int] = mapped_column(Integer, default=0)
    closing_stock: Mapped[int] = mapped_column(Integer, default=0)
    stockout_flag: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="inventory_records")
