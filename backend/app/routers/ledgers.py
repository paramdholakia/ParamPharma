from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.customer import Customer
from backend.app.models.supplier import Supplier
from backend.app.models.ledger import CustomerLedger, SupplierLedger
from backend.app.models.company import CompanySettings
from backend.app.services.pdf_generator import generate_ledger_pdf

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

@router.get("/customer/{customer_id}/pdf")
def get_customer_ledger_pdf(
    customer_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    entry_ids: Optional[str] = None,
    disposition: str = "attachment",
    db: Session = Depends(get_db)
):
    """
    Generate statutory Customer Statement of Account & Balance Confirmation PDF.
    Supports single transaction, multiple selected transactions, or full date range.
    Supports ?disposition=inline for browser printing and preview.
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    company = db.query(CompanySettings).first()
    company_dict = {c.name: getattr(company, c.name) for c in company.__table__.columns} if company else {}
    party_dict = {c.name: getattr(customer, c.name) for c in customer.__table__.columns}

    query = db.query(CustomerLedger).filter(CustomerLedger.customer_id == customer_id)
    if entry_ids:
        try:
            ids = [int(i.strip()) for i in entry_ids.split(",") if i.strip()]
            if ids:
                query = query.filter(CustomerLedger.id.in_(ids))
        except Exception:
            pass
    else:
        if from_date:
            query = query.filter(CustomerLedger.transaction_date >= from_date)
        if to_date:
            query = query.filter(CustomerLedger.transaction_date <= to_date)

    entries = query.order_by(CustomerLedger.transaction_date.asc(), CustomerLedger.id.asc()).all()
    entries_list = [{c.name: getattr(e, c.name) for c in e.__table__.columns} for e in entries]

    total_debit = sum(e.get("debit_amount", 0.0) or 0.0 for e in entries_list)
    total_credit = sum(e.get("credit_amount", 0.0) or 0.0 for e in entries_list)
    closing_bal = entries_list[-1]["running_balance"] if entries_list else customer.current_balance

    summary = {
        "opening_balance": 0.0,
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "closing_balance": round(closing_bal, 2)
    }

    from_str = from_date.strftime("%d-%b-%Y") if from_date else None
    to_str = to_date.strftime("%d-%b-%Y") if to_date else None
    stmt_title = "CUSTOMER STATEMENT OF ACCOUNT" if not entry_ids else "CUSTOMER TRANSACTIONS RECEIPT / STATEMENT"

    pdf_bytes = generate_ledger_pdf(
        company=company_dict,
        party=party_dict,
        entries=entries_list,
        summary=summary,
        party_type="customer",
        from_date=from_str,
        to_date=to_str,
        statement_title=stmt_title
    )

    safe_party = customer.party_name.replace(" ", "_").replace("/", "_")
    disp = "inline" if disposition == "inline" else "attachment"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"{disp}; filename=Customer_Ledger_{safe_party}.pdf"}
    )

@router.get("/supplier/{supplier_id}/pdf")
def get_supplier_ledger_pdf(
    supplier_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    entry_ids: Optional[str] = None,
    disposition: str = "attachment",
    db: Session = Depends(get_db)
):
    """
    Generate statutory Supplier Statement of Account & Balance Confirmation PDF.
    Supports single transaction, multiple selected transactions, or full date range.
    Supports ?disposition=inline for browser printing and preview.
    """
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    company = db.query(CompanySettings).first()
    company_dict = {c.name: getattr(company, c.name) for c in company.__table__.columns} if company else {}
    party_dict = {c.name: getattr(supplier, c.name) for c in supplier.__table__.columns}

    query = db.query(SupplierLedger).filter(SupplierLedger.supplier_id == supplier_id)
    if entry_ids:
        try:
            ids = [int(i.strip()) for i in entry_ids.split(",") if i.strip()]
            if ids:
                query = query.filter(SupplierLedger.id.in_(ids))
        except Exception:
            pass
    else:
        if from_date:
            query = query.filter(SupplierLedger.transaction_date >= from_date)
        if to_date:
            query = query.filter(SupplierLedger.transaction_date <= to_date)

    entries = query.order_by(SupplierLedger.transaction_date.asc(), SupplierLedger.id.asc()).all()
    entries_list = [{c.name: getattr(e, c.name) for c in e.__table__.columns} for e in entries]

    total_debit = sum(e.get("debit_amount", 0.0) or 0.0 for e in entries_list)
    total_credit = sum(e.get("credit_amount", 0.0) or 0.0 for e in entries_list)
    closing_bal = entries_list[-1]["running_balance"] if entries_list else supplier.current_balance

    summary = {
        "opening_balance": 0.0,
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "closing_balance": round(closing_bal, 2)
    }

    from_str = from_date.strftime("%d-%b-%Y") if from_date else None
    to_str = to_date.strftime("%d-%b-%Y") if to_date else None
    stmt_title = "SUPPLIER STATEMENT OF ACCOUNT" if not entry_ids else "SUPPLIER TRANSACTIONS VOUCHER / STATEMENT"

    pdf_bytes = generate_ledger_pdf(
        company=company_dict,
        party=party_dict,
        entries=entries_list,
        summary=summary,
        party_type="supplier",
        from_date=from_str,
        to_date=to_str,
        statement_title=stmt_title
    )

    safe_party = supplier.supplier_name.replace(" ", "_").replace("/", "_")
    disp = "inline" if disposition == "inline" else "attachment"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"{disp}; filename=Supplier_Ledger_{safe_party}.pdf"}
    )
