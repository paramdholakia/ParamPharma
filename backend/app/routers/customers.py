from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from backend.app.database import get_db
from backend.app.models.customer import Customer
from backend.app.models.invoice import SalesInvoice
from backend.app.models.payment import CustomerPayment
from backend.app.models.returns import SalesReturn
from backend.app.models.ledger import CustomerLedger
from backend.app.services.gst_engine import validate_gstin

router = APIRouter(prefix="/api/customers", tags=["Customer Management"])

class CustomerCreateSchema(BaseModel):
    customer_code: Optional[str] = None
    party_name: str
    customer_category: str = "Chemist"
    doctor_name: Optional[str] = ""
    store_name: Optional[str] = ""
    contact_person: Optional[str] = ""
    mobile: str
    alt_mobile: Optional[str] = ""
    email: Optional[str] = ""
    billing_address: str
    shipping_address: Optional[str] = ""
    gstin: Optional[str] = ""
    pan: Optional[str] = ""
    dl_number: Optional[str] = ""
    state: str = "Gujarat"
    state_code: str = "24"
    city: str = "Ahmedabad"
    pincode: Optional[str] = ""
    opening_balance: float = 0.0
    credit_limit: float = 50000.0
    payment_terms_days: int = 21
    notes: Optional[str] = ""

@router.get("")
def list_customers(
    search: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Customer).filter(Customer.is_active == True)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Customer.party_name.ilike(s),
                Customer.mobile.ilike(s),
                Customer.gstin.ilike(s),
                Customer.customer_code.ilike(s)
            )
        )
    if category and category != "All":
        query = query.filter(Customer.customer_category == category)

    total = query.count()
    customers = query.order_by(Customer.party_name.asc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "customers": customers
    }

@router.post("")
def create_customer(data: CustomerCreateSchema, db: Session = Depends(get_db)):
    if data.gstin:
        is_valid, err_msg = validate_gstin(data.gstin)
        if not is_valid:
            raise HTTPException(status_code=400, detail=err_msg)

    # Auto generate customer code if omitted
    code = data.customer_code
    if not code:
        count = db.query(Customer).count() + 1
        code = f"CUST{count:03d}"

    # Check duplicate
    if db.query(Customer).filter(Customer.customer_code == code).first():
        code = f"CUST{code}_{int(db.query(Customer).count() + 1)}"

    customer = Customer(
        customer_code=code,
        party_name=data.party_name.strip(),
        customer_category=data.customer_category,
        doctor_name=data.doctor_name,
        store_name=data.store_name,
        contact_person=data.contact_person,
        mobile=data.mobile.strip(),
        alt_mobile=data.alt_mobile,
        email=data.email,
        billing_address=data.billing_address.strip(),
        shipping_address=data.shipping_address or data.billing_address.strip(),
        gstin=data.gstin.strip().upper() if data.gstin else None,
        pan=data.pan.strip().upper() if data.pan else None,
        dl_number=data.dl_number,
        state=data.state,
        state_code=data.state_code,
        city=data.city,
        pincode=data.pincode,
        opening_balance=data.opening_balance,
        current_balance=data.opening_balance,
        credit_limit=data.credit_limit,
        payment_terms_days=data.payment_terms_days,
        notes=data.notes
    )
    db.add(customer)
    db.flush()

    # If opening balance exists, record into customer ledger
    if data.opening_balance != 0:
        ledger_entry = CustomerLedger(
            customer_id=customer.id,
            transaction_date=customer.created_at.date(),
            reference_type="Opening Balance",
            reference_number="OP-BAL",
            description="Opening Balance Recorded at Registration",
            debit_amount=data.opening_balance if data.opening_balance > 0 else 0.0,
            credit_amount=abs(data.opening_balance) if data.opening_balance < 0 else 0.0,
            running_balance=data.opening_balance
        )
        db.add(ledger_entry)

    db.commit()
    db.refresh(customer)
    return customer

@router.get("/{customer_id}/profile")
def get_customer_profile(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    invoices = (
        db.query(SalesInvoice)
        .filter(SalesInvoice.customer_id == customer_id)
        .order_by(desc(SalesInvoice.invoice_date))
        .limit(20)
        .all()
    )

    payments = (
        db.query(CustomerPayment)
        .filter(CustomerPayment.customer_id == customer_id)
        .order_by(desc(CustomerPayment.payment_date))
        .limit(20)
        .all()
    )

    ledger = (
        db.query(CustomerLedger)
        .filter(CustomerLedger.customer_id == customer_id)
        .order_by(desc(CustomerLedger.transaction_date), desc(CustomerLedger.id))
        .limit(50)
        .all()
    )

    total_sales = sum(inv.net_invoice_amount for inv in invoices if inv.status == "Finalized")
    total_received = sum(p.amount for p in payments)

    return {
        "customer": customer,
        "metrics": {
            "total_sales": round(total_sales, 2),
            "total_received": round(total_received, 2),
            "current_outstanding": round(customer.current_balance, 2),
            "credit_limit": customer.credit_limit,
            "last_transaction": str(invoices[0].invoice_date) if invoices else "None"
        },
        "recent_invoices": invoices,
        "recent_payments": payments,
        "ledger": ledger
    }

@router.put("/{customer_id}")
def update_customer(customer_id: int, data: CustomerCreateSchema, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if data.gstin:
        is_valid, err_msg = validate_gstin(data.gstin)
        if not is_valid:
            raise HTTPException(status_code=400, detail=err_msg)

    for field, val in data.model_dump(exclude_unset=True).items():
        if field not in ["customer_code", "opening_balance"]:
            setattr(customer, field, val)

    db.commit()
    db.refresh(customer)
    return customer
