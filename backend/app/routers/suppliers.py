from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from backend.app.database import get_db
from backend.app.models.supplier import Supplier
from backend.app.models.purchase import PurchaseInvoice
from backend.app.models.payment import SupplierPayment
from backend.app.models.ledger import SupplierLedger
from backend.app.services.gst_engine import validate_gstin

router = APIRouter(prefix="/api/suppliers", tags=["Supplier Management"])

class SupplierCreateSchema(BaseModel):
    supplier_code: Optional[str] = None
    supplier_name: str
    contact_person: Optional[str] = ""
    mobile: str
    email: Optional[str] = ""
    address: str
    gstin: Optional[str] = ""
    pan: Optional[str] = ""
    dl_number: Optional[str] = ""
    state: str = "Gujarat"
    state_code: str = "24"
    city: str = "Ahmedabad"
    pincode: Optional[str] = ""
    opening_balance: float = 0.0
    credit_terms_days: int = 30

@router.get("")
def list_suppliers(
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Supplier).filter(Supplier.is_active == True)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Supplier.supplier_name.ilike(s),
                Supplier.mobile.ilike(s),
                Supplier.gstin.ilike(s),
                Supplier.supplier_code.ilike(s)
            )
        )
    total = query.count()
    suppliers = query.order_by(Supplier.supplier_name.asc()).offset(skip).limit(limit).all()
    return {"total": total, "suppliers": suppliers}

@router.post("")
def create_supplier(data: SupplierCreateSchema, db: Session = Depends(get_db)):
    if data.gstin:
        is_valid, err_msg = validate_gstin(data.gstin)
        if not is_valid:
            raise HTTPException(status_code=400, detail=err_msg)

    code = data.supplier_code
    if not code:
        count = db.query(Supplier).count() + 1
        code = f"SUP{count:03d}"

    supplier = Supplier(
        supplier_code=code,
        supplier_name=data.supplier_name.strip(),
        contact_person=data.contact_person,
        mobile=data.mobile.strip(),
        email=data.email,
        address=data.address.strip(),
        gstin=data.gstin.strip().upper() if data.gstin else None,
        pan=data.pan.strip().upper() if data.pan else None,
        dl_number=data.dl_number,
        state=data.state,
        state_code=data.state_code,
        city=data.city,
        pincode=data.pincode,
        opening_balance=data.opening_balance,
        current_balance=data.opening_balance,
        credit_terms_days=data.credit_terms_days
    )
    db.add(supplier)
    db.flush()

    if data.opening_balance != 0:
        ledger_entry = SupplierLedger(
            supplier_id=supplier.id,
            transaction_date=supplier.created_at.date(),
            reference_type="Opening Balance",
            reference_number="OP-BAL",
            description="Opening Payable Balance Recorded",
            debit_amount=abs(data.opening_balance) if data.opening_balance < 0 else 0.0,
            credit_amount=data.opening_balance if data.opening_balance > 0 else 0.0,
            running_balance=data.opening_balance
        )
        db.add(ledger_entry)

    db.commit()
    db.refresh(supplier)
    return supplier

@router.get("/{supplier_id}/profile")
def get_supplier_profile(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    purchases = (
        db.query(PurchaseInvoice)
        .filter(PurchaseInvoice.supplier_id == supplier_id)
        .order_by(desc(PurchaseInvoice.purchase_date))
        .limit(20)
        .all()
    )

    payments = (
        db.query(SupplierPayment)
        .filter(SupplierPayment.supplier_id == supplier_id)
        .order_by(desc(SupplierPayment.payment_date))
        .limit(20)
        .all()
    )

    ledger = (
        db.query(SupplierLedger)
        .filter(SupplierLedger.supplier_id == supplier_id)
        .order_by(desc(SupplierLedger.transaction_date), desc(SupplierLedger.id))
        .limit(50)
        .all()
    )

    total_purchases = sum(p.net_purchase_amount for p in purchases if p.status == "Finalized")
    total_paid = sum(p.amount for p in payments)

    return {
        "supplier": supplier,
        "metrics": {
            "total_purchases": round(total_purchases, 2),
            "total_paid": round(total_paid, 2),
            "outstanding_payable": round(supplier.current_balance, 2),
            "credit_terms": f"{supplier.credit_terms_days} Days"
        },
        "recent_purchases": purchases,
        "recent_payments": payments,
        "ledger": ledger
    }

@router.put("/{supplier_id}")
def update_supplier(supplier_id: int, data: SupplierCreateSchema, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if data.gstin:
        is_valid, err_msg = validate_gstin(data.gstin)
        if not is_valid:
            raise HTTPException(status_code=400, detail=err_msg)

    for field, val in data.model_dump(exclude_unset=True).items():
        if field not in ["supplier_code", "opening_balance"]:
            setattr(supplier, field, val)

    db.commit()
    db.refresh(supplier)
    return supplier
