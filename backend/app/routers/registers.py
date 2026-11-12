from datetime import date
from fastapi import APIRouter, Depends, Query, Response
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.invoice import SalesInvoice
from backend.app.models.purchase import PurchaseInvoice
from backend.app.models.product import Product, ProductBatch
from backend.app.services.excel_exporter import (
    export_sales_register_excel, export_purchase_register_excel, export_stock_report_excel
)

router = APIRouter(prefix="/api/registers", tags=["Sales & Purchase Registers"])

@router.get("/sales")
def get_sales_register(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    customer_id: Optional[int] = None,
    tax_type: Optional[str] = None,  # "all", "gst", "non_gst"
    db: Session = Depends(get_db)
):
    query = db.query(SalesInvoice).filter(SalesInvoice.status == "Finalized")
    if from_date:
        query = query.filter(SalesInvoice.invoice_date >= from_date)
    if to_date:
        query = query.filter(SalesInvoice.invoice_date <= to_date)
    if customer_id:
        query = query.filter(SalesInvoice.customer_id == customer_id)
    if tax_type == "gst":
        query = query.filter(SalesInvoice.is_non_gst == False)
    elif tax_type == "non_gst":
        query = query.filter(SalesInvoice.is_non_gst == True)

    invoices = query.order_by(desc(SalesInvoice.invoice_date), desc(SalesInvoice.id)).all()

    gst_invoices = [i for i in invoices if not getattr(i, 'is_non_gst', False)]
    non_gst_invoices = [i for i in invoices if getattr(i, 'is_non_gst', False)]

    total_gross = sum(i.total_gross_amount for i in invoices)
    total_discount = sum(i.total_discount_amount for i in invoices)
    total_taxable = sum(i.total_taxable_amount for i in gst_invoices)
    total_non_gst_amount = sum(i.net_invoice_amount for i in non_gst_invoices)
    total_cgst = sum(i.cgst_amount for i in gst_invoices)
    total_sgst = sum(i.sgst_amount for i in gst_invoices)
    total_igst = sum(i.igst_amount for i in gst_invoices)
    total_gst = sum(i.total_gst_amount for i in gst_invoices)
    total_invoice = sum(i.net_invoice_amount for i in invoices)
    total_paid = sum(i.paid_amount for i in invoices)
    total_balance = sum(i.balance_amount for i in invoices)

    return {
        "summary": {
            "invoice_count": len(invoices),
            "gst_invoice_count": len(gst_invoices),
            "non_gst_invoice_count": len(non_gst_invoices),
            "total_gross": round(total_gross, 2),
            "total_discount": round(total_discount, 2),
            "total_taxable": round(total_taxable, 2),
            "total_non_gst_amount": round(total_non_gst_amount, 2),
            "total_cgst": round(total_cgst, 2),
            "total_sgst": round(total_sgst, 2),
            "total_igst": round(total_igst, 2),
            "total_gst": round(total_gst, 2),
            "total_invoice": round(total_invoice, 2),
            "total_paid": round(total_paid, 2),
            "total_balance": round(total_balance, 2)
        },
        "invoices": invoices
    }

@router.get("/sales/export-excel")
def export_sales_excel(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(SalesInvoice).filter(SalesInvoice.status == "Finalized")
    if from_date:
        query = query.filter(SalesInvoice.invoice_date >= from_date)
    if to_date:
        query = query.filter(SalesInvoice.invoice_date <= to_date)
    if customer_id:
        query = query.filter(SalesInvoice.customer_id == customer_id)

    invoices = query.order_by(desc(SalesInvoice.invoice_date)).all()
    inv_dicts = [{c.name: getattr(i, c.name) for c in i.__table__.columns} for i in invoices]
    excel_bytes = export_sales_register_excel(inv_dicts)

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Sales_Register.xlsx"}
    )

@router.get("/purchases")
def get_purchase_register(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    supplier_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(PurchaseInvoice).filter(PurchaseInvoice.status == "Finalized")
    if from_date:
        query = query.filter(PurchaseInvoice.purchase_date >= from_date)
    if to_date:
        query = query.filter(PurchaseInvoice.purchase_date <= to_date)
    if supplier_id:
        query = query.filter(PurchaseInvoice.supplier_id == supplier_id)

    purchases = query.order_by(desc(PurchaseInvoice.purchase_date), desc(PurchaseInvoice.id)).all()

    total_gross = sum(p.total_gross_amount for p in purchases)
    total_discount = sum(p.total_discount_amount for p in purchases)
    total_taxable = sum(p.total_taxable_amount for p in purchases)
    total_cgst = sum(p.cgst_amount for p in purchases)
    total_sgst = sum(p.sgst_amount for p in purchases)
    total_igst = sum(p.igst_amount for p in purchases)
    total_gst = sum(p.total_gst_amount for p in purchases)
    total_purchase = sum(p.net_purchase_amount for p in purchases)
    total_paid = sum(p.paid_amount for p in purchases)
    total_balance = sum(p.balance_amount for p in purchases)

    return {
        "summary": {
            "purchase_count": len(purchases),
            "total_gross": round(total_gross, 2),
            "total_discount": round(total_discount, 2),
            "total_taxable": round(total_taxable, 2),
            "total_cgst": round(total_cgst, 2),
            "total_sgst": round(total_sgst, 2),
            "total_igst": round(total_igst, 2),
            "total_gst": round(total_gst, 2),
            "total_purchase": round(total_purchase, 2),
            "total_paid": round(total_paid, 2),
            "total_balance": round(total_balance, 2)
        },
        "purchases": purchases
    }

@router.get("/purchases/export-excel")
def export_purchases_excel(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    supplier_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(PurchaseInvoice).filter(PurchaseInvoice.status == "Finalized")
    if from_date:
        query = query.filter(PurchaseInvoice.purchase_date >= from_date)
    if to_date:
        query = query.filter(PurchaseInvoice.purchase_date <= to_date)
    if supplier_id:
        query = query.filter(PurchaseInvoice.supplier_id == supplier_id)

    purchases = query.order_by(desc(PurchaseInvoice.purchase_date)).all()
    pur_dicts = [{c.name: getattr(p, c.name) for c in p.__table__.columns} for p in purchases]
    excel_bytes = export_purchase_register_excel(pur_dicts)

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Purchase_Register.xlsx"}
    )

@router.get("/stock/export-excel")
def export_stock_excel(db: Session = Depends(get_db)):
    batches = (
        db.query(ProductBatch)
        .join(Product)
        .filter(ProductBatch.is_active == True, ProductBatch.available_qty > 0)
        .order_by(Product.medicine_name.asc(), ProductBatch.expiry_date.asc())
        .all()
    )
    b_dicts = []
    today = date.today()
    for b in batches:
        b_dict = {c.name: getattr(b, c.name) for c in b.__table__.columns}
        b_dict["medicine_name"] = b.product.medicine_name
        b_dict["manufacturer"] = b.product.manufacturer
        b_dict["packing"] = b.product.packing
        b_dict["alert_status"] = "Expired" if b.expiry_date < today else ("Near Expiry" if (b.expiry_date - today).days <= 60 else "Normal")
        b_dicts.append(b_dict)

    excel_bytes = export_stock_report_excel(b_dicts)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Inventory_Valuation_Report.xlsx"}
    )
