from datetime import date
from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.services.profit_loss_service import ProfitLossService
from backend.app.models.invoice import SalesInvoice, SalesInvoiceItem
from backend.app.models.product import ProductBatch

router = APIRouter(prefix="/api/profit-loss", tags=["Profit & Loss Management"])

@router.get("")
def get_pnl_statement(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    other_income: float = 0.0,
    finance_costs: float = 0.0,
    depreciation: float = 0.0,
    tax_rate: float = 25.0,
    db: Session = Depends(get_db)
):
    return ProfitLossService.calculate_pnl(
        db=db,
        from_date=from_date,
        to_date=to_date,
        other_income=other_income,
        finance_costs=finance_costs,
        depreciation=depreciation,
        tax_rate_percent=tax_rate
    )

@router.get("/product-wise")
def get_product_wise_profit(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = (
        db.query(SalesInvoiceItem)
        .join(SalesInvoice)
        .filter(SalesInvoice.status == "Finalized")
    )
    if from_date:
        query = query.filter(SalesInvoice.invoice_date >= from_date)
    if to_date:
        query = query.filter(SalesInvoice.invoice_date <= to_date)

    items = query.all()

    prod_profit = {}
    for it in items:
        batch = db.query(ProductBatch).filter(ProductBatch.id == it.batch_id).first()
        purchase_cost = (batch.purchase_rate if batch else 0.0) * it.quantity
        selling_revenue = it.taxable_amount
        gross_profit = round(selling_revenue - purchase_cost, 2)

        key = it.product_name
        if key not in prod_profit:
            prod_profit[key] = {
                "product_name": it.product_name,
                "manufacturer": it.manufacturer,
                "packing": it.packing,
                "total_quantity_sold": 0,
                "total_free_given": 0,
                "revenue": 0.0,
                "cogs": 0.0,
                "gross_profit": 0.0
            }
        prod_profit[key]["total_quantity_sold"] += it.quantity
        prod_profit[key]["total_free_given"] += it.free_quantity
        prod_profit[key]["revenue"] = round(prod_profit[key]["revenue"] + selling_revenue, 2)
        prod_profit[key]["cogs"] = round(prod_profit[key]["cogs"] + purchase_cost, 2)
        prod_profit[key]["gross_profit"] = round(prod_profit[key]["gross_profit"] + gross_profit, 2)

    results = list(prod_profit.values())
    for r in results:
        r["profit_margin_percent"] = round((r["gross_profit"] / r["revenue"] * 100.0), 2) if r["revenue"] > 0 else 0.0

    results.sort(key=lambda x: x["gross_profit"], reverse=True)
    return results
