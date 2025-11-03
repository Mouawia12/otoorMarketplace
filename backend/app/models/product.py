from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from ..core.database import Base


class ProductCondition(str, enum.Enum):
    new = "new"
    used = "used"


class ProductType(str, enum.Enum):
    listing = "listing"
    auction = "auction"


class ProductStatus(str, enum.Enum):
    pending = "pending"
    published = "published"
    sold = "sold"
    hidden = "hidden"
    ended = "ended"


class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    brand = Column(String, index=True)
    category = Column(String, index=True)
    size_ml = Column(Integer)
    concentration = Column(String)
    condition = Column(SQLEnum(ProductCondition), nullable=False)
    description = Column(Text)
    type = Column(SQLEnum(ProductType), default=ProductType.listing)
    price = Column(Float)
    status = Column(SQLEnum(ProductStatus), default=ProductStatus.pending, index=True)
    status_reason = Column(Text)
    allow_auth_check = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    seller = relationship("User", back_populates="products", foreign_keys=[seller_id])
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    auction = relationship("Auction", back_populates="product", uselist=False)
    orders = relationship("Order", back_populates="product")
    auth_requests = relationship("AuthRequest", back_populates="product")


class ProductImage(Base):
    __tablename__ = "product_images"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    url = Column(String, nullable=False)
    sort_order = Column(Integer, default=0)
    
    product = relationship("Product", back_populates="images")
