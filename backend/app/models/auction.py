from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from ..core.database import Base


class AuctionStatus(str, enum.Enum):
    scheduled = "scheduled"
    running = "running"
    ended = "ended"


class Auction(Base):
    __tablename__ = "auctions"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, unique=True)
    start_price = Column(Float, nullable=False)
    min_increment = Column(Float, nullable=False)
    start_at = Column(DateTime(timezone=True), nullable=False)
    end_at = Column(DateTime(timezone=True), nullable=False, index=True)
    current_price = Column(Float, nullable=False)
    status = Column(SQLEnum(AuctionStatus), default=AuctionStatus.scheduled, index=True)
    end_extended_count = Column(Integer, default=0)
    
    product = relationship("Product", back_populates="auction")
    bids = relationship("Bid", back_populates="auction", cascade="all, delete-orphan")


class Bid(Base):
    __tablename__ = "bids"
    
    id = Column(Integer, primary_key=True, index=True)
    auction_id = Column(Integer, ForeignKey("auctions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    auction = relationship("Auction", back_populates="bids")
    user = relationship("User", back_populates="bids")
