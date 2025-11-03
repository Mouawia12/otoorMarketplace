from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from ..core.database import Base


class AuthRequestStatus(str, enum.Enum):
    open = "open"
    processing = "processing"
    done = "done"


class AuthRequest(Base):
    __tablename__ = "auth_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    fee_amount = Column(Float, nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(SQLEnum(AuthRequestStatus), default=AuthRequestStatus.open, index=True)
    result_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    product = relationship("Product", back_populates="auth_requests")
    requester = relationship("User", back_populates="auth_requests", foreign_keys=[requester_id])
