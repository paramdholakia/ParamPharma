from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func

from backend.app.database import get_db
from backend.app.models.product import Product, ProductBatch

router = APIRouter(prefix="/api/products", tags=["Product Master"])

class ProductCreateSchema(BaseModel):
    product_code: Optional[str] = None
    medicine_name: str
    generic_name: Optional[str] = ""
    brand_name: Optional[str] = ""
    manufacturer: str
    hsn_code: str = "30049099"
    packing: str = "10x10 Tablets"
    unit: str = "BOX"
    mrp: float = 0.0
    ptr: float = 0.0
    pts: float = 0.0
    gst_rate: float = 12.0
    min_stock_level: int = 10
    reorder_level: int = 20
    product_description: Optional[str] = ""
    status: str = "Active"

@router.get("")
def list_products(
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(Product.is_active == True)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.medicine_name.ilike(s),
                Product.generic_name.ilike(s),
                Product.manufacturer.ilike(s),
                Product.product_code.ilike(s)
            )
        )

    total = query.count()
    products = query.order_by(Product.medicine_name.asc()).offset(skip).limit(limit).all()

    # Calculate total available stock across all batches for each product
    results = []
    for p in products:
        total_stock = (
            db.query(func.coalesce(func.sum(ProductBatch.available_qty), 0))
            .filter(ProductBatch.product_id == p.id, ProductBatch.is_active == True)
            .scalar()
        )
        p_dict = {c.name: getattr(p, c.name) for c in p.__table__.columns}
        p_dict["total_available_stock"] = int(total_stock)
        p_dict["is_low_stock"] = total_stock <= p.min_stock_level
        results.append(p_dict)

    return {"total": total, "products": results}

@router.post("")
def create_product(data: ProductCreateSchema, db: Session = Depends(get_db)):
    code = data.product_code
    if not code:
        count = db.query(Product).count() + 1
        code = f"MED{count:03d}"

    product = Product(
        product_code=code,
        medicine_name=data.medicine_name.strip(),
        generic_name=data.generic_name.strip() if data.generic_name else None,
        brand_name=data.brand_name.strip() if data.brand_name else None,
        manufacturer=data.manufacturer.strip(),
        hsn_code=data.hsn_code.strip(),
        packing=data.packing.strip(),
        unit=data.unit.strip().upper(),
        mrp=data.mrp,
        ptr=data.ptr,
        pts=data.pts,
        gst_rate=data.gst_rate,
        min_stock_level=data.min_stock_level,
        reorder_level=data.reorder_level,
        product_description=data.product_description,
        status=data.status
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product



@router.get("/{product_id}/batches")
def get_product_batches(product_id: int, db: Session = Depends(get_db)):
    batches = (
        db.query(ProductBatch)
        .filter(ProductBatch.product_id == product_id, ProductBatch.is_active == True)
        .order_by(ProductBatch.expiry_date.asc())
        .all()
    )
    return batches

@router.put("/{product_id}")
def update_product(product_id: int, data: ProductCreateSchema, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, val in data.model_dump(exclude_unset=True).items():
        if field != "product_code":
            setattr(product, field, val)

    db.commit()
    db.refresh(product)
    return product

@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    batches = db.query(ProductBatch).filter(ProductBatch.product_id == product_id).all()
    total_qty = sum(b.available_qty for b in batches)
    if total_qty > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete product '{product.medicine_name}' because it currently has {total_qty} units in stock. Adjust or write-off stock first."
        )

    product.is_active = False
    for b in batches:
        b.is_active = False
    db.commit()
    return {"message": f"Product '{product.medicine_name}' deleted successfully", "product_id": product_id}


