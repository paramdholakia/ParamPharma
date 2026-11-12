from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.payment import CustomerPayment, SupplierPayment
from backend.app.models.customer import Customer
from backend.app.models.supplier import Supplier
from backend.app.models.invoice import SalesInvoice
from backend.app.models.purchase import PurchaseInvoice
from backend.app.models.company import CompanySettings
from backend.app.services.accounting_service import AccountingService
from backend.app.services.pdf_generator import generate_payment_voucher_pdf

router = APIRouter(prefix="/api/payments", tags=["Payment Management & Vouchers"])

class CustomerPaymentCreateSchema(BaseModel):
    customer_id: int
    amount: float
    payment_date: date = date.today()
    payment_mode: str = "Cash"  # Cash, Bank Transfer, UPI, Cheque, Other
    reference_no: Optional[str] = ""
    bank_name: Optional[str] = ""
    cheque_date: Optional[date] = None
    invoice_id: Optional[int] = None
    notes: Optional[str] = ""

class SupplierPaymentCreateSchema(BaseModel):
    supplier_id: int
    amount: float
    payment_date: date = date.today()
    payment_mode: str = "Bank Transfer"
    reference_no: Optional[str] = ""
    bank_name: Optional[str] = ""
    cheque_date: Optional[date] = None
    purchase_id: Optional[int] = None
    notes: Optional[str] = ""

@router.get("/customer")
def list_customer_payments(customer_id: Optional[int] = None, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(CustomerPayment)
    if customer_id:
        query = query.filter(CustomerPayment.customer_id == customer_id)
    payments = query.order_by(desc(CustomerPayment.payment_date), desc(CustomerPayment.id)).offset(skip).limit(limit).all()
    return payments

@router.post("/customer")
def record_customer_payment(data: CustomerPaymentCreateSchema, db: Session = Depends(get_db)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    company = db.query(CompanySettings).with_for_update().first()
    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    receipt_num = f"{company.receipt_prefix}{company.financial_year}/{company.next_receipt_num}"
    company.next_receipt_num += 1

    payment = CustomerPayment(
        receipt_number=receipt_num,
        payment_date=data.payment_date,
        customer_id=customer.id,
        customer_name=customer.party_name,
        amount=round(data.amount, 2),
        payment_mode=data.payment_mode,
        reference_no=data.reference_no,
        bank_name=data.bank_name,
        cheque_date=data.cheque_date,
        invoice_id=data.invoice_id,
        notes=data.notes
    )
    db.add(payment)

    # Post Credit in Customer Ledger (Reduces customer debt)
    desc_str = f"Payment Received via {data.payment_mode}"
    if data.reference_no:
        desc_str += f" (Ref: {data.reference_no})"
    if data.invoice_id:
        desc_str += f" against Inv #{data.invoice_id}"

    AccountingService.post_customer_transaction(
        db=db,
        customer_id=customer.id,
        transaction_date=data.payment_date,
        reference_type="Payment",
        reference_id=payment.id,
        reference_number=receipt_num,
        description=desc_str,
        debit_amount=0.0,
        credit_amount=round(data.amount, 2)
    )

    # If linked to specific invoice, update that invoice's balance
    if data.invoice_id:
        inv = db.query(SalesInvoice).filter(SalesInvoice.id == data.invoice_id).first()
        if inv:
            inv.paid_amount = round(inv.paid_amount + data.amount, 2)
            inv.balance_amount = max(0.0, round(inv.net_invoice_amount - inv.paid_amount, 2))
            inv.payment_status = "Paid" if inv.balance_amount == 0 else "Partial"

    db.commit()
    db.refresh(payment)
    return {"message": "Payment receipt created successfully", "payment": payment}

@router.get("/supplier")
def list_supplier_payments(supplier_id: Optional[int] = None, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(SupplierPayment)
    if supplier_id:
        query = query.filter(SupplierPayment.supplier_id == supplier_id)
    payments = query.order_by(desc(SupplierPayment.payment_date), desc(SupplierPayment.id)).offset(skip).limit(limit).all()
    return payments

@router.post("/supplier")
def record_supplier_payment(data: SupplierPaymentCreateSchema, db: Session = Depends(get_db)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    company = db.query(CompanySettings).with_for_update().first()
    supplier = db.query(Supplier).filter(Supplier.id == data.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")

    voucher_num = f"{company.voucher_prefix}{company.financial_year}/{company.next_voucher_num}"
    company.next_voucher_num += 1

    payment = SupplierPayment(
        voucher_number=voucher_num,
        payment_date=data.payment_date,
        supplier_id=supplier.id,
        supplier_name=supplier.supplier_name,
        amount=round(data.amount, 2),
        payment_mode=data.payment_mode,
        reference_no=data.reference_no,
        bank_name=data.bank_name,
        cheque_date=data.cheque_date,
        purchase_id=data.purchase_id,
        notes=data.notes
    )
    db.add(payment)

    # Post Debit in Supplier Ledger (Reduces payable to supplier)
    desc_str = f"Payment Made via {data.payment_mode}"
    if data.reference_no:
        desc_str += f" (Ref: {data.reference_no})"
    if data.purchase_id:
        desc_str += f" against Purchase #{data.purchase_id}"

    AccountingService.post_supplier_transaction(
        db=db,
        supplier_id=supplier.id,
        transaction_date=data.payment_date,
        reference_type="Payment",
        reference_id=payment.id,
        reference_number=voucher_num,
        description=desc_str,
        debit_amount=round(data.amount, 2),
        credit_amount=0.0
    )

    if data.purchase_id:
        pur = db.query(PurchaseInvoice).filter(PurchaseInvoice.id == data.purchase_id).first()
        if pur:
            pur.paid_amount = round(pur.paid_amount + data.amount, 2)
            pur.balance_amount = max(0.0, round(pur.net_purchase_amount - pur.paid_amount, 2))
            pur.payment_status = "Paid" if pur.balance_amount == 0 else "Partial"

    db.commit()
    db.refresh(payment)
    return {"message": "Payment voucher created successfully", "payment": payment}

@router.get("/customer/{payment_id}/pdf")
def download_customer_receipt_pdf(payment_id: int, db: Session = Depends(get_db)):
    """
    Download official Payment Receipt Voucher PDF for customer collection.
    """
    payment = db.query(CustomerPayment).filter(CustomerPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Customer payment receipt not found")

    customer = db.query(Customer).filter(Customer.id == payment.customer_id).first()
    company = db.query(CompanySettings).first()

    company_dict = {c.name: getattr(company, c.name) for c in company.__table__.columns} if company else {}
    party_dict = {c.name: getattr(customer, c.name) for c in customer.__table__.columns} if customer else {
        "party_name": payment.customer_name, "category": "Chemist"
    }
    payment_dict = {c.name: getattr(payment, c.name) for c in payment.__table__.columns}

    pdf_bytes = generate_payment_voucher_pdf(
        company=company_dict,
        party=party_dict,
        payment=payment_dict,
        is_customer=True
    )
    safe_rec = payment.receipt_number.replace("/", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Receipt_{safe_rec}.pdf"}
    )

@router.get("/supplier/{payment_id}/pdf")
def download_supplier_voucher_pdf(payment_id: int, db: Session = Depends(get_db)):
    """
    Download official Payment Disbursement Voucher PDF for supplier remittance.
    """
    payment = db.query(SupplierPayment).filter(SupplierPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Supplier payment voucher not found")

    supplier = db.query(Supplier).filter(Supplier.id == payment.supplier_id).first()
    company = db.query(CompanySettings).first()

    company_dict = {c.name: getattr(company, c.name) for c in company.__table__.columns} if company else {}
    party_dict = {c.name: getattr(supplier, c.name) for c in supplier.__table__.columns} if supplier else {
        "supplier_name": payment.supplier_name
    }
    payment_dict = {c.name: getattr(payment, c.name) for c in payment.__table__.columns}

    pdf_bytes = generate_payment_voucher_pdf(
        company=company_dict,
        party=party_dict,
        payment=payment_dict,
        is_customer=False
    )
    safe_vch = payment.voucher_number.replace("/", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Voucher_{safe_vch}.pdf"}
    )
