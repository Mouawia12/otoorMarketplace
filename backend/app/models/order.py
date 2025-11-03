from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Boolean, Text, Enum as SQLEnum, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from ..core.database import Base


class PaymentMethod(str, enum.Enum):
    cod = "cod"
    bank = "bank"


class OrderStatus(str, enum.Enum):
    pending = "pending"
    seller_confirmed = "seller_confirmed"
    shipped = "shipped"
    completed = "completed"
    canceled = "canceled"
    dispute = "dispute"


class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.pending, index=True)
    shipping_address_json = Column(JSON)
    notes = Column(Text)
    internal_notes = Column(Text)
    dispute_flag = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    buyer = relationship("User", back_populates="orders_as_buyer", foreign_keys=[buyer_id])
    product = relationship("Product", back_populates="orders")
