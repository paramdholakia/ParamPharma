from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from backend.app.database import get_db
from backend.app.models.purchase import PurchaseInvoice, PurchaseInvoiceItem
from backend.app.models.supplier import Supplier
from backend.app.models.product import Product, ProductBatch
from backend.app.models.company import CompanySettings
from backend.app.models.payment import SupplierPayment
from backend.app.services.gst_engine import (
    calculate_line_item_gst, calculate_invoice_totals, is_interstate_transaction
)
from backend.app.services.inventory_service import InventoryService
from backend.app.services.accounting_service import AccountingService

router = APIRouter(prefix="/api/purchases", tags=["Purchase Billing & Inward Stock"])

class PurchaseInvoiceItemSchema(BaseModel):
    product_id: int
    batch_number: str
    mfg_date: Optional[date] = None
    expiry_date: date
    mrp: float
    purchase_rate: float
    ptr: Optional[float] = None
    pts: Optional[float] = None
    quantity: int
    free_quantity: int = 0
    discount_percent: float = 0.0
    gst_rate: float = 12.0

class PurchaseInvoiceCreateSchema(BaseModel):
    supplier_id: int
    supplier_invoice_number: str
    purchase_date: date = date.today()
    payment_terms: str = "30 Days"
    due_date: Optional[date] = None
    paid_amount: float = 0.0
    payment_mode: str = "Bank Transfer"
    notes: Optional[str] = ""
    status: str = "Finalized"
    items: List[PurchaseInvoiceItemSchema]

@router.get("")
def list_purchases(
    search: Optional[str] = None,
    supplier_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(PurchaseInvoice)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                PurchaseInvoice.purchase_entry_number.ilike(s),
                PurchaseInvoice.supplier_invoice_number.ilike(s),
                PurchaseInvoice.supplier_name.ilike(s)
            )
        )
    if supplier_id:
        query = query.filter(PurchaseInvoice.supplier_id == supplier_id)
    if from_date:
        query = query.filter(PurchaseInvoice.purchase_date >= from_date)
    if to_date:
        query = query.filter(PurchaseInvoice.purchase_date <= to_date)

    total = query.count()
    purchases = query.order_by(desc(PurchaseInvoice.purchase_date), desc(PurchaseInvoice.id)).offset(skip).limit(limit).all()
    return {"total": total, "purchases": purchases}

@router.get("/{purchase_id}")
def get_purchase_detail(purchase_id: int, db: Session = Depends(get_db)):
    purchase = db.query(PurchaseInvoice).filter(PurchaseInvoice.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase invoice not found")
    items = db.query(PurchaseInvoiceItem).filter(PurchaseInvoiceItem.purchase_id == purchase_id).all()
    return {"purchase": purchase, "items": items}

@router.post("")
def create_purchase_invoice(data: PurchaseInvoiceCreateSchema, db: Session = Depends(get_db)):
    if not data.items:
        raise HTTPException(status_code=400, detail="Purchase must contain at least one product.")

    company = db.query(CompanySettings).with_for_update().first()
    supplier = db.query(Supplier).filter(Supplier.id == data.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")

    # Duplicate invoice protection
    dup = (
        db.query(PurchaseInvoice)
        .filter(
            PurchaseInvoice.supplier_id == supplier.id,
            PurchaseInvoice.supplier_invoice_number == data.supplier_invoice_number.strip()
        )
        .first()
    )
    if dup:
        raise HTTPException(
            status_code=400,
            detail=f"Duplicate invoice! Bill No. '{data.supplier_invoice_number}' already exists for supplier '{supplier.supplier_name}'."
        )

    is_interstate = is_interstate_transaction(company.state_code, supplier.state_code)

    items_breakdown = []
    prepared_items = []

    for item_in in data.items:
        product = db.query(Product).filter(Product.id == item_in.product_id).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product ID {item_in.product_id} not found.")

        calc = calculate_line_item_gst(
            quantity=item_in.quantity,
            rate=item_in.purchase_rate,
            discount_percent=item_in.discount_percent,
            gst_rate=item_in.gst_rate,
            is_interstate=is_interstate
        )
        items_breakdown.append(calc)

        ptr = item_in.ptr or round(item_in.purchase_rate * 1.15, 2)
        pts = item_in.pts or round(item_in.purchase_rate * 1.05, 2)

        prepared_items.append({
            "product_id": product.id,
            "product_name": product.medicine_name,
            "hsn_code": product.hsn_code,
            "manufacturer": product.manufacturer,
            "packing": product.packing,
            "batch_number": item_in.batch_number.strip().upper(),
            "mfg_date": item_in.mfg_date,
            "expiry_date": item_in.expiry_date,
            "mrp": item_in.mrp,
            "purchase_rate": item_in.purchase_rate,
            "ptr": ptr,
            "pts": pts,
            "quantity": item_in.quantity,
            "free_quantity": item_in.free_quantity,
            "discount_percent": item_in.discount_percent,
            "discount_amount": calc["discount_amount"],
            "taxable_amount": calc["taxable_amount"],
            "gst_rate": calc["gst_rate"],
            "cgst_rate": calc["cgst_rate"],
            "cgst_amount": calc["cgst_amount"],
            "sgst_rate": calc["sgst_rate"],
            "sgst_amount": calc["sgst_amount"],
            "igst_rate": calc["igst_rate"],
            "igst_amount": calc["igst_amount"],
            "total_amount": calc["total_amount"]
        })

    totals = calculate_invoice_totals(items_breakdown)
    net_total = totals["net_invoice_amount"]
    paid_amt = min(net_total, max(0.0, data.paid_amount))
    balance_amt = round(net_total - paid_amt, 2)
    payment_status = "Paid" if balance_amt == 0 else ("Partial" if paid_amt > 0 else "Unpaid")

    entry_num = f"{company.purchase_prefix}{company.next_purchase_num}"
    company.next_purchase_num += 1

    purchase = PurchaseInvoice(
        purchase_entry_number=entry_num,
        supplier_invoice_number=data.supplier_invoice_number.strip(),
        purchase_date=data.purchase_date,
        supplier_id=supplier.id,
        supplier_name=supplier.supplier_name,
        supplier_address=supplier.address,
        gstin=supplier.gstin,
        dl_number=supplier.dl_number,
        pan=supplier.pan,
        state=supplier.state,
        state_code=supplier.state_code,
        is_interstate=is_interstate,
        payment_terms=data.payment_terms,
        due_date=data.due_date,
        total_gross_amount=totals["total_gross_amount"],
        total_discount_amount=totals["total_discount_amount"],
        total_taxable_amount=totals["total_taxable_amount"],
        cgst_amount=totals["cgst_amount"],
        sgst_amount=totals["sgst_amount"],
        igst_amount=totals["igst_amount"],
        total_gst_amount=totals["total_gst_amount"],
        round_off=totals["round_off"],
        net_purchase_amount=net_total,
        paid_amount=paid_amt,
        balance_amount=balance_amt,
        payment_status=payment_status,
        status=data.status,
        notes=data.notes
    )
    db.add(purchase)
    db.flush()

    for it in prepared_items:
        p_item = PurchaseInvoiceItem(purchase_id=purchase.id, **it)
        db.add(p_item)

    if data.status == "Finalized":
        # Inward stock
        InventoryService.process_purchase_stock_inward(
            db=db,
            items=prepared_items,
            purchase_id=purchase.id,
            purchase_number=entry_num
        )

        # Post Credit in Supplier Ledger (Increases payable)
        AccountingService.post_supplier_transaction(
            db=db,
            supplier_id=supplier.id,
            transaction_date=data.purchase_date,
            reference_type="Purchase",
            reference_id=purchase.id,
            reference_number=entry_num,
            description=f"Purchase Bill {data.supplier_invoice_number} (Ref: {entry_num})",
            debit_amount=0.0,
            credit_amount=net_total
        )

        # If immediate payment was made
        if paid_amt > 0:
            vch_code = f"VCH/{company.financial_year}/{company.next_voucher_num}"
            company.next_voucher_num += 1

            p_vch = SupplierPayment(
                voucher_number=vch_code,
                payment_date=data.purchase_date,
                supplier_id=supplier.id,
                supplier_name=supplier.supplier_name,
                amount=paid_amt,
                payment_mode=data.payment_mode,
                purchase_id=purchase.id,
                notes=f"Payment against bill {data.supplier_invoice_number}"
            )
            db.add(p_vch)

            # Post Debit in Supplier Ledger (Reduces payable)
            AccountingService.post_supplier_transaction(
                db=db,
                supplier_id=supplier.id,
                transaction_date=data.purchase_date,
                reference_type="Payment",
                reference_id=purchase.id,
                reference_number=vch_code,
                description=f"Payment via {data.payment_mode} for Bill {data.supplier_invoice_number}",
                debit_amount=paid_amt,
                credit_amount=0.0
            )

    db.commit()
    db.refresh(purchase)
    return {"message": "Purchase invoice saved and stock inwarded successfully", "purchase": purchase}
