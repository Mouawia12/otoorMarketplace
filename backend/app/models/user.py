from sqlalchemy import Column, Integer, String, DateTime, ARRAY, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from ..core.database import Base


class UserStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"


class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"
    moderator = "moderator"
    support = "support"
    seller = "seller"
    buyer = "buyer"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    roles = Column(ARRAY(String), default=["buyer"])
    status = Column(SQLEnum(UserStatus), default=UserStatus.active, index=True)
    verified_seller = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    products = relationship("Product", back_populates="seller", foreign_keys="Product.seller_id")
    bids = relationship("Bid", back_populates="user")
    orders_as_buyer = relationship("Order", back_populates="buyer", foreign_keys="Order.buyer_id")
    auth_requests = relationship("AuthRequest", back_populates="requester", foreign_keys="AuthRequest.requester_id")
    tickets = relationship("Ticket", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="admin")
