from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.product import Product, ProductBatch
from backend.app.models.inventory import StockAdjustment, StockMovement
from backend.app.services.inventory_service import InventoryService

router = APIRouter(prefix="/api/batches", tags=["Batch Management & Expiry Tracking"])

class StockAdjustmentSchema(BaseModel):
    product_id: int
    batch_id: int
    adjustment_type: str  # INCREASE, DECREASE, EXPIRED_SCRAP, DAMAGE_WRITE_OFF
    quantity: int
    reason: str
    authorized_by: str = "Admin"

@router.get("/fefo-suggest/{product_id}")
def suggest_fefo_batch(product_id: int, min_qty: int = 1, db: Session = Depends(get_db)):
    """Returns batches sorted by FEFO (earliest expiry first) with stock"""
    batches = InventoryService.get_fefo_batches(db, product_id, min_qty)
    return batches

@router.get("/check-fefo")
def check_fefo(product_id: int, batch_id: int, db: Session = Depends(get_db)):
    """Checks if selected batch violates FEFO or is expired"""
    return InventoryService.check_fefo_compliance(db, product_id, batch_id)

@router.get("/expiry-alerts")
def get_expiry_alerts(db: Session = Depends(get_db)):
    """
    Returns alerts for:
    - Expired batches
    - Expiring within 30 days
    - Expiring within 60 days
    - Expiring within 90 days
    """
    today = date.today()
    in_30 = today + timedelta(days=30)
    in_60 = today + timedelta(days=60)
    in_90 = today + timedelta(days=90)

    # Active batches with available stock
    batches = (
        db.query(ProductBatch)
        .join(Product)
        .filter(ProductBatch.is_active == True, ProductBatch.available_qty > 0)
        .order_by(ProductBatch.expiry_date.asc())
        .all()
    )

    expired = []
    within_30 = []
    within_60 = []
    within_90 = []

    for b in batches:
        item = {
            "batch_id": b.id,
            "product_id": b.product_id,
            "medicine_name": b.product.medicine_name,
            "manufacturer": b.product.manufacturer,
            "packing": b.product.packing,
            "batch_number": b.batch_number,
            "expiry_date": str(b.expiry_date),
            "days_remaining": (b.expiry_date - today).days,
            "available_qty": b.available_qty,
            "purchase_rate": b.purchase_rate,
            "mrp": b.mrp,
            "stock_value": round(b.available_qty * b.purchase_rate, 2)
        }

        if b.expiry_date < today:
            expired.append(item)
        elif b.expiry_date <= in_30:
            within_30.append(item)
        elif b.expiry_date <= in_60:
            within_60.append(item)
        elif b.expiry_date <= in_90:
            within_90.append(item)

    return {
        "summary": {
            "expired_count": len(expired),
            "within_30_count": len(within_30),
            "within_60_count": len(within_60),
            "within_90_count": len(within_90),
        },
        "expired": expired,
        "within_30": within_30,
        "within_60": within_60,
        "within_90": within_90
    }

@router.post("/adjust-stock")
def adjust_stock(data: StockAdjustmentSchema, db: Session = Depends(get_db)):
    """Adjusts stock with audit trail"""
    batch = db.query(ProductBatch).filter(ProductBatch.id == data.batch_id).with_for_update().first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    prev_qty = batch.available_qty
    if data.adjustment_type in ["DECREASE", "EXPIRED_SCRAP", "DAMAGE_WRITE_OFF"]:
        if prev_qty < data.quantity:
            raise HTTPException(status_code=400, detail=f"Cannot reduce {data.quantity} units; current available is {prev_qty}.")
        new_qty = prev_qty - data.quantity
        mov_type = f"ADJUST_{data.adjustment_type}"
        mov_qty = -data.quantity
    elif data.adjustment_type == "INCREASE":
        new_qty = prev_qty + data.quantity
        mov_type = "ADJUST_INCREASE"
        mov_qty = data.quantity
    else:
        raise HTTPException(status_code=400, detail="Invalid adjustment type")

    batch.available_qty = new_qty

    adjustment = StockAdjustment(
        product_id=data.product_id,
        batch_id=data.batch_id,
        adjustment_date=date.today(),
        adjustment_type=data.adjustment_type,
        quantity=data.quantity,
        previous_quantity=prev_qty,
        new_quantity=new_qty,
        reason=data.reason,
        authorized_by=data.authorized_by
    )
    db.add(adjustment)

    movement = StockMovement(
        product_id=data.product_id,
        batch_id=data.batch_id,
        movement_date=date.today(),
        movement_type=mov_type,
        reference_number=f"ADJ-{batch.batch_number}",
        quantity=mov_qty,
        batch_number=batch.batch_number,
        balance_after=new_qty,
        notes=f"Stock Adjustment: {data.reason} (Auth: {data.authorized_by})"
    )
    db.add(movement)

    db.commit()
    db.refresh(batch)

    return {
        "message": "Stock adjusted successfully",
        "batch_number": batch.batch_number,
        "previous_quantity": prev_qty,
        "new_quantity": new_qty
    }
