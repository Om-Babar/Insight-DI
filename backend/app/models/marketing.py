from datetime import date
from sqlalchemy import String, Float, Integer, Date, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Marketing(Base):
    __tablename__ = "marketing"

    marketing_id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    channel: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    spend: Mapped[float] = mapped_column(Float, default=0.0)
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    conversions: Mapped[int] = mapped_column(Integer, default=0)
