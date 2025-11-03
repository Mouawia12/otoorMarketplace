from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
import enum
from ..core.database import Base


class AdPosition(str, enum.Enum):
    hero = "hero"
    sidebar = "sidebar"
    strip = "strip"


class AdStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class Ad(Base):
    __tablename__ = "ads"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    position = Column(SQLEnum(AdPosition), nullable=False, index=True)
    image_url = Column(String, nullable=False)
    target_url = Column(String)
    status = Column(SQLEnum(AdStatus), default=AdStatus.active, index=True)
    start_at = Column(DateTime(timezone=True), nullable=True)
    end_at = Column(DateTime(timezone=True), nullable=True)
