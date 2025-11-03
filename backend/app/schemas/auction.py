from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BidCreate(BaseModel):
    amount: float


class BidResponse(BaseModel):
    id: int
    auction_id: int
    user_id: int
    amount: float
    created_at: datetime

    class Config:
        from_attributes = True


class AuctionCreate(BaseModel):
    product_id: int
    start_price: float
    min_increment: float
    start_at: datetime
    end_at: datetime


class AuctionResponse(BaseModel):
    id: int
    product_id: int
    start_price: float
    min_increment: float
    start_at: datetime
    end_at: datetime
    current_price: float
    status: str
    end_extended_count: int

    class Config:
        from_attributes = True


class AuctionWithBids(AuctionResponse):
    bids: list[BidResponse] = []
