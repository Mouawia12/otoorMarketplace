from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..core.dependencies import get_current_user, require_roles
from ..models.user import User
from ..models.product import Product, ProductImage
from ..schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductModeration

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=List[ProductResponse])
def get_products(
    type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: str = Query("published"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    if status != "published":
        raise HTTPException(status_code=403, detail="Cannot query non-published products")
    
    query = db.query(Product).filter(Product.status == status)
    
    if type:
        query = query.filter(Product.type == type)
    if search:
        query = query.filter(Product.title.ilike(f"%{search}%"))
    if brand:
        query = query.filter(Product.brand == brand)
    if category:
        query = query.filter(Product.category == category)
    
    products = query.offset((page - 1) * page_size).limit(page_size).all()
    return products


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("", response_model=ProductResponse)
def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(require_roles(["seller"])),
    db: Session = Depends(get_db)
):
    new_product = Product(
        seller_id=current_user.id,
        title=product_data.title,
        brand=product_data.brand,
        category=product_data.category,
        size_ml=product_data.size_ml,
        concentration=product_data.concentration,
        condition=product_data.condition,
        description=product_data.description,
        type=product_data.type,
        price=product_data.price,
        status="pending"
    )
    
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    
    for idx, image_url in enumerate(product_data.images):
        image = ProductImage(product_id=new_product.id, url=image_url, sort_order=idx)
        db.add(image)
    
    db.commit()
    db.refresh(new_product)
    
    return new_product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    current_user: User = Depends(require_roles(["seller"])),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.seller_id == current_user.id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product_data.model_dump(exclude_unset=True)
    if "status" in update_data:
        del update_data["status"]
    
    for key, value in update_data.items():
        setattr(product, key, value)
    
    db.commit()
    db.refresh(product)
    
    return product


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    current_user: User = Depends(require_roles(["seller"])),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.seller_id == current_user.id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    
    return {"message": "Product deleted successfully"}


@router.patch("/{product_id}/approve", response_model=ProductResponse)
def approve_product(
    product_id: int,
    current_user: User = Depends(require_roles(["admin", "super_admin", "moderator"])),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.status = "published"
    product.status_reason = None
    db.commit()
    db.refresh(product)
    
    return product


@router.patch("/{product_id}/reject", response_model=ProductResponse)
def reject_product(
    product_id: int,
    moderation: ProductModeration,
    current_user: User = Depends(require_roles(["admin", "super_admin", "moderator"])),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.status = "hidden"
    product.status_reason = moderation.reason
    db.commit()
    db.refresh(product)
    
    return product
