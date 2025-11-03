from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..core.dependencies import require_roles
from ..models.user import User
from ..models.product import Product
from ..models.order import Order
from ..models.auction import Auction

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
def get_dashboard_stats(
    current_user: User = Depends(require_roles(["admin", "super_admin"])),
    db: Session = Depends(get_db)
):
    total_products = db.query(Product).count()
    pending_products = db.query(Product).filter(Product.status == "pending").count()
    total_orders = db.query(Order).count()
    pending_orders = db.query(Order).filter(Order.status == "pending").count()
    running_auctions = db.query(Auction).filter(Auction.status == "running").count()
    
    return {
        "total_products": total_products,
        "pending_products": pending_products,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "running_auctions": running_auctions
    }


@router.get("/users")
def get_all_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(["admin", "super_admin"])),
    db: Session = Depends(get_db)
):
    users = db.query(User).offset((page - 1) * page_size).limit(page_size).all()
    return users


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    status: str,
    current_user: User = Depends(require_roles(["admin", "super_admin"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.status = status
    db.commit()
    
    return {"message": f"User status updated to {status}"}


@router.patch("/users/{user_id}/roles")
def update_user_roles(
    user_id: int,
    roles: List[str],
    current_user: User = Depends(require_roles(["super_admin"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.roles = roles
    db.commit()
    
    return {"message": "User roles updated"}
