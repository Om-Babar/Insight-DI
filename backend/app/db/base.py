from sqlalchemy.orm import DeclarativeBase, declared_attr
from datetime import datetime, timezone
from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

    @declared_attr.directive
    def __tablename__(cls) -> str:
        """Default table name to lowercased class name + 's' if not set."""
        return cls.__name__.lower() + "s"
