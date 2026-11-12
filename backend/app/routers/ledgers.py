from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.customer import Customer
from backend.app.models.supplier import Supplier
from backend.app.models.ledger import CustomerLedger, SupplierLedger

router = APIRouter(prefix="/api/ledgers", tags=["Ledger Management"])

@router.get("/customer/{customer_id}")
def get_customer_ledger(
    customer_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    query = db.query(CustomerLedger).filter(CustomerLedger.customer_id == customer_id)
    if from_date:
        query = query.filter(CustomerLedger.transaction_date >= from_date)
    if to_date:
        query = query.filter(CustomerLedger.transaction_date <= to_date)

    entries = query.order_by(CustomerLedger.transaction_date.asc(), CustomerLedger.id.asc()).all()

    total_debit = sum(e.debit_amount for e in entries)
    total_credit = sum(e.credit_amount for e in entries)

    return {
        "customer": {
            "id": customer.id,
            "party_name": customer.party_name,
            "category": customer.customer_category,
            "mobile": customer.mobile,
            "gstin": customer.gstin,
            "current_balance": customer.current_balance,
        },
        "summary": {
            "total_debit": round(total_debit, 2),
            "total_credit": round(total_credit, 2),
            "closing_balance": customer.current_balance
        },
        "entries": entries
    }

@router.get("/supplier/{supplier_id}")
def get_supplier_ledger(
    supplier_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    query = db.query(SupplierLedger).filter(SupplierLedger.supplier_id == supplier_id)
    if from_date:
        query = query.filter(SupplierLedger.transaction_date >= from_date)
    if to_date:
        query = query.filter(SupplierLedger.transaction_date <= to_date)

    entries = query.order_by(SupplierLedger.transaction_date.asc(), SupplierLedger.id.asc()).all()

    total_debit = sum(e.debit_amount for e in entries)
    total_credit = sum(e.credit_amount for e in entries)

    return {
        "supplier": {
            "id": supplier.id,
            "supplier_name": supplier.supplier_name,
            "mobile": supplier.mobile,
            "gstin": supplier.gstin,
            "current_balance": supplier.current_balance,
        },
        "summary": {
            "total_debit": round(total_debit, 2),
            "total_credit": round(total_credit, 2),
            "closing_balance": supplier.current_balance
        },
        "entries": entries
    }
