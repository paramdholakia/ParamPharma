from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from backend.app.database import get_db
from backend.app.models.invoice import SalesInvoice, SalesInvoiceItem
from backend.app.models.customer import Customer
from backend.app.models.product import Product, ProductBatch
from backend.app.models.company import CompanySettings
from backend.app.models.payment import CustomerPayment
from backend.app.services.gst_engine import (
    calculate_line_item_gst, calculate_invoice_totals, is_interstate_transaction
)
from backend.app.services.inventory_service import InventoryService
from backend.app.services.accounting_service import AccountingService
from backend.app.services.pdf_generator import generate_invoice_pdf
from backend.app.services.excel_exporter import export_invoice_excel

router = APIRouter(prefix="/api/sales", tags=["Sales Billing & GST"])

class SalesInvoiceItemSchema(BaseModel):
    product_id: int
    batch_id: int
    quantity: int
    free_quantity: int = 0
    rate: float
    discount_percent: float = 0.0
    gst_rate: Optional[float] = None

class SalesInvoiceCreateSchema(BaseModel):
    customer_id: int
    invoice_date: date = date.today()
    payment_terms: str = "21 Days"
    due_date: Optional[date] = None
    salesperson: Optional[str] = ""
    payment_mode: str = "Credit"  # Cash, Credit, Bank Transfer, UPI, Cheque
    paid_amount: float = 0.0
    notes: Optional[str] = ""
    include_upi_qr: bool = True
    is_non_gst: bool = False
    upi_id: Optional[str] = None
    status: str = "Finalized"  # Draft or Finalized
    allow_expired_override: bool = False
    items: List[SalesInvoiceItemSchema]

@router.get("")
def list_sales_invoices(
    search: Optional[str] = None,
    customer_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(SalesInvoice)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                SalesInvoice.invoice_number.ilike(s),
                SalesInvoice.customer_name.ilike(s),
                SalesInvoice.gstin.ilike(s)
            )
        )
    if customer_id:
        query = query.filter(SalesInvoice.customer_id == customer_id)
    if from_date:
        query = query.filter(SalesInvoice.invoice_date >= from_date)
    if to_date:
        query = query.filter(SalesInvoice.invoice_date <= to_date)
    if status and status != "All":
        query = query.filter(SalesInvoice.status == status)

    total = query.count()
    invoices = query.order_by(desc(SalesInvoice.invoice_date), desc(SalesInvoice.id)).offset(skip).limit(limit).all()
    return {"total": total, "invoices": invoices}

@router.get("/{invoice_id}")
def get_invoice_detail(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(SalesInvoice).filter(SalesInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    items = db.query(SalesInvoiceItem).filter(SalesInvoiceItem.invoice_id == invoice_id).all()
    return {"invoice": invoice, "items": items}

@router.post("")
def create_sales_invoice(data: SalesInvoiceCreateSchema, db: Session = Depends(get_db)):
    if not data.items:
        raise HTTPException(status_code=400, detail="Invoice must contain at least one product.")

    company = db.query(CompanySettings).with_for_update().first()
    if not company:
        raise HTTPException(status_code=400, detail="Company settings not found.")

    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    is_interstate = is_interstate_transaction(company.state_code, customer.state_code)

    # 1. Process line items and compute GST
    items_breakdown = []
    prepared_items = []

    for item_in in data.items:
        product = db.query(Product).filter(Product.id == item_in.product_id).first()
        batch = db.query(ProductBatch).filter(ProductBatch.id == item_in.batch_id).first()
        if not product or not batch:
            raise HTTPException(status_code=400, detail="Invalid product or batch reference.")

        if data.is_non_gst:
            line_gst = 0.0
            calc = calculate_line_item_gst(
                quantity=item_in.quantity,
                rate=item_in.rate,
                discount_percent=item_in.discount_percent,
                gst_rate=0.0,
                is_interstate=False
            )
        else:
            line_gst = item_in.gst_rate if item_in.gst_rate is not None else batch.gst_rate
            calc = calculate_line_item_gst(
                quantity=item_in.quantity,
                rate=item_in.rate,
                discount_percent=item_in.discount_percent,
                gst_rate=line_gst,
                is_interstate=is_interstate
            )
        items_breakdown.append(calc)

        prepared_items.append({
            "product_id": product.id,
            "batch_id": batch.id,
            "product_name": product.medicine_name,
            "hsn_code": product.hsn_code,
            "manufacturer": product.manufacturer,
            "packing": product.packing,
            "batch_number": batch.batch_number,
            "expiry_date": batch.expiry_date,
            "mrp": batch.mrp,
            "ptr": batch.ptr,
            "pts": batch.pts,
            "rate": item_in.rate,
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

    # 2. Compute Invoice Totals
    totals = calculate_invoice_totals(items_breakdown)
    net_total = totals["net_invoice_amount"]
    paid_amt = min(net_total, max(0.0, data.paid_amount))
    balance_amt = round(net_total - paid_amt, 2)

    payment_status = "Paid" if balance_amt == 0 else ("Partial" if paid_amt > 0 else "Unpaid")

    # 3. Generate Invoice Number
    inv_num = f"{company.invoice_prefix}{company.next_invoice_num}"
    company.next_invoice_num += 1

    invoice = SalesInvoice(
        invoice_number=inv_num,
        invoice_date=data.invoice_date,
        customer_id=customer.id,
        customer_name=customer.party_name,
        customer_category=customer.customer_category,
        billing_address=customer.billing_address,
        gstin=customer.gstin,
        dl_number=customer.dl_number,
        pan=customer.pan,
        state=customer.state,
        state_code=customer.state_code,
        place_of_supply=customer.state,
        is_interstate=is_interstate,
        payment_terms=data.payment_terms,
        due_date=data.due_date,
        salesperson=data.salesperson,
        total_gross_amount=totals["total_gross_amount"],
        total_discount_amount=totals["total_discount_amount"],
        total_taxable_amount=totals["total_taxable_amount"],
        cgst_amount=totals["cgst_amount"],
        sgst_amount=totals["sgst_amount"],
        igst_amount=totals["igst_amount"],
        total_gst_amount=totals["total_gst_amount"],
        round_off=totals["round_off"],
        net_invoice_amount=net_total,
        paid_amount=paid_amt,
        balance_amount=balance_amt,
        payment_mode=data.payment_mode,
        payment_status=payment_status,
        status=data.status,
        notes=data.notes,
        include_upi_qr=data.include_upi_qr,
        is_non_gst=data.is_non_gst,
        upi_id=data.upi_id or company.upi_id or "aldholakia72@okicici"
    )
    db.add(invoice)
    db.flush()

    for item_data in prepared_items:
        inv_item = SalesInvoiceItem(invoice_id=invoice.id, **item_data)
        db.add(inv_item)

    # 4. If Finalized, deduct stock and update Customer Ledger
    if data.status == "Finalized":
        try:
            InventoryService.process_sales_stock_deduction(
                db=db,
                items=prepared_items,
                invoice_id=invoice.id,
                invoice_number=inv_num,
                allow_expired_override=data.allow_expired_override
            )
        except ValueError as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=str(e))

        # Post Debit in Customer Ledger (Increases outstanding)
        AccountingService.post_customer_transaction(
            db=db,
            customer_id=customer.id,
            transaction_date=data.invoice_date,
            reference_type="Invoice",
            reference_id=invoice.id,
            reference_number=inv_num,
            description=f"Sales Tax Invoice {inv_num}",
            debit_amount=net_total,
            credit_amount=0.0
        )

        # If immediate payment was made (e.g. Cash / Bank)
        if paid_amt > 0:
            receipt_code = f"RCP/{company.financial_year}/{company.next_receipt_num}"
            company.next_receipt_num += 1

            payment = CustomerPayment(
                receipt_number=receipt_code,
                payment_date=data.invoice_date,
                customer_id=customer.id,
                customer_name=customer.party_name,
                amount=paid_amt,
                payment_mode=data.payment_mode,
                invoice_id=invoice.id,
                notes=f"Payment received against Invoice {inv_num}"
            )
            db.add(payment)

            # Post Credit in Customer Ledger (Reduces outstanding)
            AccountingService.post_customer_transaction(
                db=db,
                customer_id=customer.id,
                transaction_date=data.invoice_date,
                reference_type="Payment",
                reference_id=invoice.id,
                reference_number=receipt_code,
                description=f"Payment Received via {data.payment_mode} against {inv_num}",
                debit_amount=0.0,
                credit_amount=paid_amt
            )

    db.commit()
    db.refresh(invoice)
    return {"message": "Invoice created successfully", "invoice": invoice}

@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(invoice_id: int, include_qr: Optional[bool] = Query(None), db: Session = Depends(get_db)):
    invoice = db.query(SalesInvoice).filter(SalesInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    company = db.query(CompanySettings).first()
    items = db.query(SalesInvoiceItem).filter(SalesInvoiceItem.invoice_id == invoice_id).all()

    company_dict = {c.name: getattr(company, c.name) for c in company.__table__.columns}
    invoice_dict = {c.name: getattr(invoice, c.name) for c in invoice.__table__.columns}
    items_list = [{c.name: getattr(it, c.name) for c in it.__table__.columns} for it in items]

    qr_flag = include_qr if include_qr is not None else getattr(invoice, "include_upi_qr", True)
    pdf_bytes = generate_invoice_pdf(company_dict, invoice_dict, items_list, include_qr=qr_flag)
    safe_name = invoice.invoice_number.replace("/", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Invoice_{safe_name}.pdf"}
    )

@router.get("/{invoice_id}/excel")
def download_invoice_excel(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(SalesInvoice).filter(SalesInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    company = db.query(CompanySettings).first()
    items = db.query(SalesInvoiceItem).filter(SalesInvoiceItem.invoice_id == invoice_id).all()

    company_dict = {c.name: getattr(company, c.name) for c in company.__table__.columns}
    invoice_dict = {c.name: getattr(invoice, c.name) for c in invoice.__table__.columns}
    items_list = [{c.name: getattr(it, c.name) for c in it.__table__.columns} for it in items]

    excel_bytes = export_invoice_excel(company_dict, invoice_dict, items_list)
    safe_name = invoice.invoice_number.replace("/", "_")
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Invoice_{safe_name}.xlsx"}
    )
