from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.returns import SalesReturn, SalesReturnItem, PurchaseReturn, PurchaseReturnItem
from backend.app.models.customer import Customer
from backend.app.models.supplier import Supplier
from backend.app.models.product import ProductBatch
from backend.app.models.inventory import StockMovement
from backend.app.models.company import CompanySettings
from backend.app.services.accounting_service import AccountingService

router = APIRouter(prefix="/api/returns", tags=["Sales & Purchase Returns (Credit / Debit Notes)"])

class SalesReturnItemSchema(BaseModel):
    product_id: int
    batch_id: int
    product_name: str
    batch_number: str
    quantity: int
    rate: float
    gst_rate: float = 12.0
    condition: str = "Damaged"  # Sellable, Damaged, Expired

class SalesReturnCreateSchema(BaseModel):
    customer_id: int
    original_invoice_id: Optional[int] = None
    original_invoice_number: Optional[str] = ""
    return_date: date = date.today()
    return_reason: str = "Expired / Breakage Return"
    notes: Optional[str] = ""
    items: List[SalesReturnItemSchema]

class PurchaseReturnItemSchema(BaseModel):
    product_id: int
    batch_id: int
    product_name: str
    batch_number: str
    quantity: int
    rate: float
    gst_rate: float = 12.0
    condition: str = "Expired"

class PurchaseReturnCreateSchema(BaseModel):
    supplier_id: int
    original_purchase_id: Optional[int] = None
    original_purchase_number: Optional[str] = ""
    return_date: date = date.today()
    return_reason: str = "Expired / Damage return to company"
    notes: Optional[str] = ""
    items: List[PurchaseReturnItemSchema]

@router.get("/sales")
def list_sales_returns(db: Session = Depends(get_db)):
    returns = db.query(SalesReturn).order_by(desc(SalesReturn.return_date), desc(SalesReturn.id)).all()
    return returns

@router.post("/sales")
def create_sales_return(data: SalesReturnCreateSchema, db: Session = Depends(get_db)):
    if not data.items:
        raise HTTPException(status_code=400, detail="Return must have at least one item")

    company = db.query(CompanySettings).with_for_update().first()
    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    ret_num = f"RET-S/{company.financial_year}/{company.next_credit_note_num}"
    cn_num = f"{company.credit_note_prefix}{company.financial_year}/{company.next_credit_note_num}"
    company.next_credit_note_num += 1

    total_taxable = 0.0
    total_gst = 0.0
    total_return = 0.0

    prepared_items = []
    for it in data.items:
        taxable = round(it.quantity * it.rate, 2)
        gst = round(taxable * (it.gst_rate / 100.0), 2)
        tot = round(taxable + gst, 2)
        total_taxable += taxable
        total_gst += gst
        total_return += tot

        prepared_items.append({
            "product_id": it.product_id,
            "batch_id": it.batch_id,
            "product_name": it.product_name,
            "batch_number": it.batch_number,
            "quantity": it.quantity,
            "rate": it.rate,
            "gst_rate": it.gst_rate,
            "taxable_amount": taxable,
            "gst_amount": gst,
            "total_amount": tot,
            "condition": it.condition,
            "approved_to_stock": False  # Awaiting inspection
        })

    sales_ret = SalesReturn(
        return_number=ret_num,
        return_date=data.return_date,
        original_invoice_id=data.original_invoice_id,
        original_invoice_number=data.original_invoice_number,
        customer_id=customer.id,
        customer_name=customer.party_name,
        credit_note_number=cn_num,
        total_taxable_amount=round(total_taxable, 2),
        total_gst_amount=round(total_gst, 2),
        total_return_amount=round(total_return, 2),
        status="Pending Inspection",
        return_reason=data.return_reason,
        notes=data.notes
    )
    db.add(sales_ret)
    db.flush()

    for it_dict in prepared_items:
        db.add(SalesReturnItem(return_id=sales_ret.id, **it_dict))

    db.commit()
    db.refresh(sales_ret)
    return {"message": "Sales return recorded. Awaiting inspection for stock approval.", "return": sales_ret}

@router.post("/sales/{return_id}/approve")
def approve_sales_return(return_id: int, db: Session = Depends(get_db)):
    """Approves sales return, posts credit note to Customer Ledger, and adds sellable goods back to stock"""
    sales_ret = db.query(SalesReturn).filter(SalesReturn.id == return_id).first()
    if not sales_ret:
        raise HTTPException(status_code=404, detail="Return not found")
    if sales_ret.status == "Approved":
        raise HTTPException(status_code=400, detail="Return already approved")

    items = db.query(SalesReturnItem).filter(SalesReturnItem.return_id == return_id).all()
    for it in items:
        # If sellable, restore to available inventory
        if it.condition == "Sellable":
            batch = db.query(ProductBatch).filter(ProductBatch.id == it.batch_id).first()
            if batch:
                batch.available_qty += it.quantity
                batch.returned_customer_qty += it.quantity
                it.approved_to_stock = True

                movement = StockMovement(
                    product_id=it.product_id,
                    batch_id=batch.id,
                    movement_date=date.today(),
                    movement_type="SALES_RETURN",
                    reference_id=sales_ret.id,
                    reference_number=sales_ret.credit_note_number,
                    quantity=it.quantity,
                    batch_number=batch.batch_number,
                    balance_after=batch.available_qty,
                    notes=f"Approved Sales Return CN: {sales_ret.credit_note_number}"
                )
                db.add(movement)

    sales_ret.status = "Approved"

    # Post Credit in Customer Ledger (Reduces customer debt by credit note amount)
    AccountingService.post_customer_transaction(
        db=db,
        customer_id=sales_ret.customer_id,
        transaction_date=sales_ret.return_date,
        reference_type="Credit Note",
        reference_id=sales_ret.id,
        reference_number=sales_ret.credit_note_number,
        description=f"Credit Note issued for Sales Return ({sales_ret.return_reason})",
        debit_amount=0.0,
        credit_amount=sales_ret.total_return_amount
    )

    db.commit()
    return {"message": "Sales return approved, Credit Note posted to ledger, and inventory updated."}

@router.get("/purchases")
def list_purchase_returns(db: Session = Depends(get_db)):
    returns = db.query(PurchaseReturn).order_by(desc(PurchaseReturn.return_date), desc(PurchaseReturn.id)).all()
    return returns

@router.post("/purchases")
def create_purchase_return(data: PurchaseReturnCreateSchema, db: Session = Depends(get_db)):
    if not data.items:
        raise HTTPException(status_code=400, detail="Return must have at least one item")

    company = db.query(CompanySettings).with_for_update().first()
    supplier = db.query(Supplier).filter(Supplier.id == data.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    ret_num = f"RET-P/{company.financial_year}/{company.next_debit_note_num}"
    dn_num = f"{company.debit_note_prefix}{company.financial_year}/{company.next_debit_note_num}"
    company.next_debit_note_num += 1

    total_taxable = 0.0
    total_gst = 0.0
    total_return = 0.0

    prepared_items = []
    for it in data.items:
        batch = db.query(ProductBatch).filter(ProductBatch.id == it.batch_id).first()
        if not batch or batch.available_qty < it.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient batch quantity for return: {it.batch_number}")

        batch.available_qty -= it.quantity
        batch.returned_supplier_qty += it.quantity

        taxable = round(it.quantity * it.rate, 2)
        gst = round(taxable * (it.gst_rate / 100.0), 2)
        tot = round(taxable + gst, 2)
        total_taxable += taxable
        total_gst += gst
        total_return += tot

        prepared_items.append({
            "product_id": it.product_id,
            "batch_id": it.batch_id,
            "product_name": it.product_name,
            "batch_number": it.batch_number,
            "quantity": it.quantity,
            "rate": it.rate,
            "gst_rate": it.gst_rate,
            "taxable_amount": taxable,
            "gst_amount": gst,
            "total_amount": tot,
            "condition": it.condition
        })

        movement = StockMovement(
            product_id=it.product_id,
            batch_id=batch.id,
            movement_date=data.return_date,
            movement_type="PURCHASE_RETURN",
            reference_number=dn_num,
            quantity=-it.quantity,
            batch_number=batch.batch_number,
            balance_after=batch.available_qty,
            notes=f"Purchase Return DN: {dn_num}"
        )
        db.add(movement)

    pur_ret = PurchaseReturn(
        return_number=ret_num,
        return_date=data.return_date,
        original_purchase_id=data.original_purchase_id,
        original_purchase_number=data.original_purchase_number,
        supplier_id=supplier.id,
        supplier_name=supplier.supplier_name,
        debit_note_number=dn_num,
        total_taxable_amount=round(total_taxable, 2),
        total_gst_amount=round(total_gst, 2),
        total_return_amount=round(total_return, 2),
        status="Finalized",
        return_reason=data.return_reason,
        notes=data.notes
    )
    db.add(pur_ret)
    db.flush()

    for it_dict in prepared_items:
        db.add(PurchaseReturnItem(return_id=pur_ret.id, **it_dict))

    # Post Debit in Supplier Ledger (Reduces payable to supplier)
    AccountingService.post_supplier_transaction(
        db=db,
        supplier_id=supplier.id,
        transaction_date=data.return_date,
        reference_type="Debit Note",
        reference_id=pur_ret.id,
        reference_number=dn_num,
        description=f"Debit Note issued for Purchase Return ({data.return_reason})",
        debit_amount=round(total_return, 2),
        credit_amount=0.0
    )

    db.commit()
    db.refresh(pur_ret)
    return {"message": "Purchase return finalized, Debit Note posted, and stock deducted.", "return": pur_ret}
