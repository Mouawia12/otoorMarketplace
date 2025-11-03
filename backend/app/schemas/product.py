from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ProductImageCreate(BaseModel):
    url: str
    sort_order: int = 0


class ProductImageResponse(BaseModel):
    id: int
    url: str
    sort_order: int

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    title: str
    brand: Optional[str] = None
    category: Optional[str] = None
    size_ml: Optional[int] = None
    concentration: Optional[str] = None
    condition: str
    description: Optional[str] = None
    type: str = "listing"
    price: Optional[float] = None
    images: List[str] = []


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    size_ml: Optional[int] = None
    concentration: Optional[str] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    status: Optional[str] = None


class ProductResponse(BaseModel):
    id: int
    seller_id: int
    title: str
    brand: Optional[str]
    category: Optional[str]
    size_ml: Optional[int]
    concentration: Optional[str]
    condition: str
    description: Optional[str]
    type: str
    price: Optional[float]
    status: str
    allow_auth_check: bool
    created_at: datetime
    images: List[ProductImageResponse] = []

    class Config:
        from_attributes = True


class ProductModeration(BaseModel):
    status: str
    reason: Optional[str] = None
