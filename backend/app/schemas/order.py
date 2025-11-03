from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class OrderCreate(BaseModel):
    product_id: int
    shipping_address_json: Dict[str, Any]
    payment_method: str
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    status: str
    internal_notes: Optional[str] = None
    dispute_flag: Optional[bool] = None


class OrderResponse(BaseModel):
    id: int
    buyer_id: int
    product_id: int
    amount: float
    payment_method: str
    status: str
    shipping_address_json: Optional[Dict[str, Any]]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
