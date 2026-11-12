from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.app.database import get_db
from backend.app.models.invoice import SalesInvoice, SalesInvoiceItem
from backend.app.models.purchase import PurchaseInvoice
from backend.app.models.customer import Customer
from backend.app.models.supplier import Supplier
from backend.app.models.product import Product, ProductBatch
from backend.app.models.expense import Expense
from backend.app.models.payment import CustomerPayment
from backend.app.services.profit_loss_service import ProfitLossService

router = APIRouter(prefix="/api/dashboard", tags=["Business Dashboard"])

@router.get("")
def get_dashboard_metrics(
    time_range: str = Query("monthly", description="daily, weekly, monthly, quarterly, yearly, custom"),
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    today = date.today()

    # Determine date range
    if time_range == "daily":
        range_start = today
        range_end = today
        range_label = f"Today ({today.strftime('%d/%b/%Y')})"
    elif time_range == "weekly":
        range_start = today - timedelta(days=6)
        range_end = today
        range_label = f"Last 7 Days ({range_start.strftime('%d/%b')} - {range_end.strftime('%d/%b/%Y')})"
    elif time_range == "quarterly":
        # Indian Financial Year Quarter calculation
        month = today.month
        year = today.year
        if 4 <= month <= 6:
            range_start = date(year, 4, 1)
            range_end = date(year, 6, 30)
            range_label = f"Q1 FY {year}-{str(year+1)[2:]} (Apr - Jun)"
        elif 7 <= month <= 9:
            range_start = date(year, 7, 1)
            range_end = date(year, 9, 30)
            range_label = f"Q2 FY {year}-{str(year+1)[2:]} (Jul - Sep)"
        elif 10 <= month <= 12:
            range_start = date(year, 10, 1)
            range_end = date(year, 12, 31)
            range_label = f"Q3 FY {year}-{str(year+1)[2:]} (Oct - Dec)"
        else:
            range_start = date(year, 1, 1)
            range_end = date(year, 3, 31)
            range_label = f"Q4 FY {year-1}-{str(year)[2:]} (Jan - Mar)"
    elif time_range == "yearly":
        # Current FY
        if today.month >= 4:
            range_start = date(today.year, 4, 1)
            range_end = date(today.year + 1, 3, 31)
            range_label = f"FY {today.year}-{str(today.year+1)[2:]}"
        else:
            range_start = date(today.year - 1, 4, 1)
            range_end = date(today.year, 3, 31)
            range_label = f"FY {today.year-1}-{str(today.year)[2:]}"
    elif time_range == "custom" and from_date and to_date:
        range_start = from_date
        range_end = to_date
        range_label = f"Custom ({range_start.strftime('%d/%b/%Y')} - {range_end.strftime('%d/%b/%Y')})"
    else:  # default monthly
        time_range = "monthly"
        range_start = today.replace(day=1)
        range_end = today
        range_label = f"This Month ({today.strftime('%B %Y')})"

    # 1. Selected Period Metrics
    period_sales = (
        db.query(func.coalesce(func.sum(SalesInvoice.net_invoice_amount), 0.0))
        .filter(
            SalesInvoice.invoice_date >= range_start,
            SalesInvoice.invoice_date <= range_end,
            SalesInvoice.status == "Finalized"
        )
        .scalar()
    )
    period_purchases = (
        db.query(func.coalesce(func.sum(PurchaseInvoice.net_purchase_amount), 0.0))
        .filter(
            PurchaseInvoice.purchase_date >= range_start,
            PurchaseInvoice.purchase_date <= range_end,
            PurchaseInvoice.status == "Finalized"
        )
        .scalar()
    )
    period_pnl = ProfitLossService.calculate_pnl(db=db, from_date=range_start, to_date=range_end)

    # 2. Today's snapshot
    today_sales = (
        db.query(func.coalesce(func.sum(SalesInvoice.net_invoice_amount), 0.0))
        .filter(SalesInvoice.invoice_date == today, SalesInvoice.status == "Finalized")
        .scalar()
    )
    today_purchases = (
        db.query(func.coalesce(func.sum(PurchaseInvoice.net_purchase_amount), 0.0))
        .filter(PurchaseInvoice.purchase_date == today, PurchaseInvoice.status == "Finalized")
        .scalar()
    )

    # 3. Balances
    total_receivables = (
        db.query(func.coalesce(func.sum(Customer.current_balance), 0.0))
        .filter(Customer.is_active == True, Customer.current_balance > 0)
        .scalar()
    )
    total_payables = (
        db.query(func.coalesce(func.sum(Supplier.current_balance), 0.0))
        .filter(Supplier.is_active == True, Supplier.current_balance > 0)
        .scalar()
    )

    # 4. Inventory counts
    total_products = db.query(Product).filter(Product.is_active == True).count()
    active_batches = db.query(ProductBatch).filter(ProductBatch.is_active == True, ProductBatch.available_qty > 0).all()
    
    total_stock_qty = sum(b.available_qty for b in active_batches)
    current_inventory_value = sum(b.available_qty * b.purchase_rate for b in active_batches)

    # Expiry counts
    expired_count = sum(1 for b in active_batches if b.expiry_date < today)
    near_expiry_count = sum(1 for b in active_batches if today <= b.expiry_date <= (today + timedelta(days=60)))

    # Low stock count
    all_prods = db.query(Product).filter(Product.is_active == True).all()
    low_stock_count = 0
    for p in all_prods:
        p_stock = sum(b.available_qty for b in active_batches if b.product_id == p.id)
        if p_stock <= p.min_stock_level:
            low_stock_count += 1

    # 5. Recent records
    recent_sales = db.query(SalesInvoice).order_by(desc(SalesInvoice.id)).limit(5).all()
    recent_purchases = db.query(PurchaseInvoice).order_by(desc(PurchaseInvoice.id)).limit(5).all()
    recent_payments = db.query(CustomerPayment).order_by(desc(CustomerPayment.id)).limit(5).all()
    recent_expenses = db.query(Expense).order_by(desc(Expense.id)).limit(5).all()

    # 6. Top Selling Products in period
    top_items = (
        db.query(
            SalesInvoiceItem.product_name,
            func.sum(SalesInvoiceItem.quantity).label("total_qty"),
            func.sum(SalesInvoiceItem.total_amount).label("total_sales")
        )
        .join(SalesInvoice)
        .filter(
            SalesInvoice.invoice_date >= range_start,
            SalesInvoice.invoice_date <= range_end,
            SalesInvoice.status == "Finalized"
        )
        .group_by(SalesInvoiceItem.product_name)
        .order_by(desc("total_qty"))
        .limit(6)
        .all()
    )
    top_selling = [
        {"product_name": row[0], "total_qty": int(row[1]), "total_sales": round(row[2], 2)}
        for row in top_items
    ]

    # 7. Customer-wise Sales in period
    cust_sales_q = (
        db.query(
            SalesInvoice.customer_name,
            func.sum(SalesInvoice.net_invoice_amount).label("cust_total"),
            func.count(SalesInvoice.id).label("bill_count")
        )
        .filter(
            SalesInvoice.invoice_date >= range_start,
            SalesInvoice.invoice_date <= range_end,
            SalesInvoice.status == "Finalized"
        )
        .group_by(SalesInvoice.customer_name)
        .order_by(desc("cust_total"))
        .limit(5)
        .all()
    )
    customer_distribution = [
        {"customer_name": row[0], "total_amount": round(row[1], 2), "invoice_count": int(row[2])}
        for row in cust_sales_q
    ]

    # 8. Interactive Trend Series points
    # Generate daily or weekly data points for the active range
    trend_series = []
    num_days = (range_end - range_start).days + 1
    
    if num_days <= 31:
        # Day by day trend
        step = 1
        curr = range_start
        while curr <= range_end:
            day_s = (
                db.query(func.coalesce(func.sum(SalesInvoice.net_invoice_amount), 0.0))
                .filter(SalesInvoice.invoice_date == curr, SalesInvoice.status == "Finalized")
                .scalar()
            )
            day_p = (
                db.query(func.coalesce(func.sum(PurchaseInvoice.net_purchase_amount), 0.0))
                .filter(PurchaseInvoice.purchase_date == curr, PurchaseInvoice.status == "Finalized")
                .scalar()
            )
            trend_series.append({
                "date": str(curr),
                "label": curr.strftime("%d %b"),
                "sales": round(day_s, 2),
                "purchases": round(day_p, 2),
                "profit": round(day_s - day_p, 2)
            })
            curr += timedelta(days=1)
    else:
        # Group by week or month if > 31 days
        chunk_days = 7 if num_days <= 120 else 30
        curr = range_start
        while curr <= range_end:
            next_curr = min(range_end, curr + timedelta(days=chunk_days - 1))
            chunk_s = (
                db.query(func.coalesce(func.sum(SalesInvoice.net_invoice_amount), 0.0))
                .filter(
                    SalesInvoice.invoice_date >= curr,
                    SalesInvoice.invoice_date <= next_curr,
                    SalesInvoice.status == "Finalized"
                )
                .scalar()
            )
            chunk_p = (
                db.query(func.coalesce(func.sum(PurchaseInvoice.net_purchase_amount), 0.0))
                .filter(
                    PurchaseInvoice.purchase_date >= curr,
                    PurchaseInvoice.purchase_date <= next_curr,
                    PurchaseInvoice.status == "Finalized"
                )
                .scalar()
            )
            trend_series.append({
                "date": str(curr),
                "label": f"{curr.strftime('%d/%b')} - {next_curr.strftime('%d/%b')}",
                "sales": round(chunk_s, 2),
                "purchases": round(chunk_p, 2),
                "profit": round(chunk_s - chunk_p, 2)
            })
            curr = next_curr + timedelta(days=1)

    return {
        "range_info": {
            "time_range": time_range,
            "range_label": range_label,
            "from_date": str(range_start),
            "to_date": str(range_end),
        },
        "kpis": {
            "period_sales": round(period_sales, 2),
            "period_purchases": round(period_purchases, 2),
            "period_gross_profit": period_pnl["gross_profit"],
            "period_net_profit": period_pnl["net_profit"],
            "period_cogs": period_pnl["cogs"],
            "period_expenses": period_pnl["total_operating_expenses"],
            "today_sales": round(today_sales, 2),
            "today_purchases": round(today_purchases, 2),
            "total_receivables": round(total_receivables, 2),
            "total_payables": round(total_payables, 2),
            "current_inventory_value": round(current_inventory_value, 2),
            "total_products": total_products,
            "total_stock_qty": total_stock_qty,
            "low_stock_count": low_stock_count,
            "near_expiry_count": near_expiry_count,
            "expired_count": expired_count,
        },
        "trend_series": trend_series,
        "recent_sales": recent_sales,
        "recent_purchases": recent_purchases,
        "recent_payments": recent_payments,
        "recent_expenses": recent_expenses,
        "top_selling": top_selling,
        "customer_distribution": customer_distribution,
        "expense_breakdown": period_pnl["expense_by_category"],
    }
