from datetime import date, datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.product import Product, ProductBatch
from backend.app.models.inventory import StockMovement, StockAdjustment

class InventoryService:
    @staticmethod
    def get_fefo_batches(db: Session, product_id: int, min_qty: int = 1) -> List[ProductBatch]:
        """
        Returns batches ordered by earliest expiry date first (FEFO).
        Only returns active batches with available quantity > 0.
        """
        return (
            db.query(ProductBatch)
            .filter(
                ProductBatch.product_id == product_id,
                ProductBatch.is_active == True,
                ProductBatch.available_qty >= min_qty
            )
            .order_by(ProductBatch.expiry_date.asc())
            .all()
        )

    @staticmethod
    def check_fefo_compliance(db: Session, product_id: int, selected_batch_id: int) -> Dict[str, Any]:
        """
        Validates if selected batch adheres to FEFO.
        If an earlier valid batch with stock exists, returns warning info.
        """
        selected_batch = db.query(ProductBatch).filter(ProductBatch.id == selected_batch_id).first()
        if not selected_batch:
            return {"valid": False, "warning": "Batch not found", "suggested_batch": None}

        today = date.today()
        # Check if selected batch is expired
        if selected_batch.expiry_date < today:
            return {
                "valid": True,
                "is_expired": True,
                "warning": f"ALERT: Selected batch {selected_batch.batch_number} expired on {selected_batch.expiry_date.strftime('%d/%m/%Y')}! Selling expired drugs is prohibited.",
                "suggested_batch": None
            }

        # Check for earlier active non-expired batch
        earlier_batch = (
            db.query(ProductBatch)
            .filter(
                ProductBatch.product_id == product_id,
                ProductBatch.id != selected_batch_id,
                ProductBatch.is_active == True,
                ProductBatch.available_qty > 0,
                ProductBatch.expiry_date >= today,
                ProductBatch.expiry_date < selected_batch.expiry_date
            )
            .order_by(ProductBatch.expiry_date.asc())
            .first()
        )

        if earlier_batch:
            return {
                "valid": True,
                "is_expired": False,
                "warning": f"FEFO Notice: An earlier batch ({earlier_batch.batch_number}, Expiry: {earlier_batch.expiry_date.strftime('%m/%y')}, Stock: {earlier_batch.available_qty}) is available. It is recommended to sell earlier batches first.",
                "suggested_batch": {
                    "id": earlier_batch.id,
                    "batch_number": earlier_batch.batch_number,
                    "expiry_date": str(earlier_batch.expiry_date),
                    "available_qty": earlier_batch.available_qty
                }
            }

        return {"valid": True, "is_expired": False, "warning": None, "suggested_batch": None}

    @staticmethod
    def process_sales_stock_deduction(
        db: Session,
        items: List[Dict[str, Any]],
        invoice_id: int,
        invoice_number: str,
        allow_expired_override: bool = False
    ):
        """
        Deducts billed quantity AND scheme free quantity from batch inventory.
        Validates stock sufficiency before deducting.
        """
        today = date.today()
        for item in items:
            batch_id = item["batch_id"]
            qty = item["quantity"]
            free_qty = item.get("free_quantity", 0)
            total_deduct = qty + free_qty

            batch = db.query(ProductBatch).filter(ProductBatch.id == batch_id).with_for_update().first()
            if not batch:
                raise ValueError(f"Batch ID {batch_id} not found.")

            if batch.expiry_date < today and not allow_expired_override:
                raise ValueError(f"Cannot sell batch {batch.batch_number} as it expired on {batch.expiry_date}.")

            if batch.available_qty < total_deduct:
                product = db.query(Product).filter(Product.id == batch.product_id).first()
                name = product.medicine_name if product else "Unknown"
                raise ValueError(
                    f"Insufficient stock for '{name}' (Batch: {batch.batch_number}). "
                    f"Requested: {total_deduct} ({qty} billed + {free_qty} free), Available: {batch.available_qty}."
                )

            batch.sold_qty += qty
            batch.free_sold_qty += free_qty
            batch.available_qty -= total_deduct

            # Record stock movements
            if qty > 0:
                movement = StockMovement(
                    product_id=batch.product_id,
                    batch_id=batch.id,
                    movement_date=today,
                    movement_type="SALE",
                    reference_id=invoice_id,
                    reference_number=invoice_number,
                    quantity=-qty,
                    batch_number=batch.batch_number,
                    balance_after=batch.available_qty + free_qty,
                    notes=f"Sales Invoice {invoice_number}"
                )
                db.add(movement)

            if free_qty > 0:
                free_movement = StockMovement(
                    product_id=batch.product_id,
                    batch_id=batch.id,
                    movement_date=today,
                    movement_type="SALE_FREE",
                    reference_id=invoice_id,
                    reference_number=invoice_number,
                    quantity=-free_qty,
                    batch_number=batch.batch_number,
                    balance_after=batch.available_qty,
                    notes=f"Scheme Free Units on Invoice {invoice_number}"
                )
                db.add(free_movement)

    @staticmethod
    def process_purchase_stock_inward(
        db: Session,
        items: List[Dict[str, Any]],
        purchase_id: int,
        purchase_number: str
    ):
        """
        Increases batch inventory for both purchased and scheme free quantities.
        Creates new batch if it does not already exist.
        """
        today = date.today()
        for item in items:
            product_id = item["product_id"]
            batch_num = item["batch_number"].strip().upper()
            qty = item["quantity"]
            free_qty = item.get("free_quantity", 0)
            total_inward = qty + free_qty

            batch = (
                db.query(ProductBatch)
                .filter(
                    ProductBatch.product_id == product_id,
                    ProductBatch.batch_number == batch_num
                )
                .first()
            )

            if not batch:
                batch = ProductBatch(
                    product_id=product_id,
                    batch_number=batch_num,
                    mfg_date=item.get("mfg_date"),
                    expiry_date=item["expiry_date"],
                    purchase_rate=item["purchase_rate"],
                    mrp=item["mrp"],
                    ptr=item.get("ptr", item["purchase_rate"] * 1.15),
                    pts=item.get("pts", item["purchase_rate"] * 1.05),
                    gst_rate=item.get("gst_rate", 12.0),
                    opening_stock=0,
                    purchased_qty=qty,
                    free_purchased_qty=free_qty,
                    available_qty=total_inward
                )
                db.add(batch)
                db.flush()
            else:
                batch.purchased_qty += qty
                batch.free_purchased_qty += free_qty
                batch.available_qty += total_inward
                batch.purchase_rate = item["purchase_rate"]
                batch.mrp = item["mrp"]
                if item.get("expiry_date"):
                    batch.expiry_date = item["expiry_date"]

            # Record Inward Movements
            movement = StockMovement(
                product_id=product_id,
                batch_id=batch.id,
                movement_date=today,
                movement_type="PURCHASE",
                reference_id=purchase_id,
                reference_number=purchase_number,
                quantity=qty,
                batch_number=batch_num,
                balance_after=batch.available_qty - free_qty,
                notes=f"Purchase Entry {purchase_number}"
            )
            db.add(movement)

            if free_qty > 0:
                free_mov = StockMovement(
                    product_id=product_id,
                    batch_id=batch.id,
                    movement_date=today,
                    movement_type="PURCHASE_FREE",
                    reference_id=purchase_id,
                    reference_number=purchase_number,
                    quantity=free_qty,
                    batch_number=batch_num,
                    balance_after=batch.available_qty,
                    notes=f"Supplier Scheme Free Inward {purchase_number}"
                )
                db.add(free_movement if 'free_movement' in locals() else free_mov)
