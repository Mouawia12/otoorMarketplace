from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..core.dependencies import get_current_user, require_roles
from ..models.user import User
from ..models.order import Order
from ..models.product import Product
from ..schemas.order import OrderCreate, OrderUpdate, OrderResponse

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderResponse)
def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == order_data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.status != "published":
        raise HTTPException(status_code=400, detail="Product is not available")
    
    new_order = Order(
        buyer_id=current_user.id,
        product_id=order_data.product_id,
        amount=product.price,
        payment_method=order_data.payment_method,
        shipping_address_json=order_data.shipping_address_json,
        notes=order_data.notes,
        status="pending"
    )
    
    product.status = "sold"
    
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    return new_order


@router.get("/mine", response_model=List[OrderResponse])
def get_my_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    orders = db.query(Order).filter(Order.buyer_id == current_user.id).all()
    return orders


@router.get("", response_model=List[OrderResponse])
def get_all_orders(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(["admin", "super_admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(Order)
    
    if status:
        query = query.filter(Order.status == status)
    
    orders = query.offset((page - 1) * page_size).limit(page_size).all()
    return orders


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    order_update: OrderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    product = db.query(Product).filter(Product.id == order.product_id).first()
    
    user_roles = current_user.roles or []
    is_admin = any(role in user_roles for role in ["admin", "super_admin"])
    is_seller = product.seller_id == current_user.id and "seller" in user_roles
    is_buyer = order.buyer_id == current_user.id
    
    if not (is_admin or is_seller or is_buyer):
        raise HTTPException(status_code=403, detail="Not authorized to update this order")
    
    if is_buyer and order_update.status not in ["canceled"]:
        raise HTTPException(status_code=403, detail="Buyers can only cancel orders")
    
    if is_seller and order_update.status not in ["seller_confirmed", "shipped", "completed"]:
        raise HTTPException(status_code=403, detail="Invalid status for seller")
    
    order.status = order_update.status
    if order_update.internal_notes and is_admin:
        order.internal_notes = order_update.internal_notes
    if order_update.dispute_flag is not None and is_admin:
        order.dispute_flag = order_update.dispute_flag
    
    db.commit()
    db.refresh(order)
    
    return order
