from datetime import date, timedelta
from fastapi import APIRouter, Depends
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
def get_dashboard_metrics(db: Session = Depends(get_db)):
    today = date.today()
    first_day_month = today.replace(day=1)

    # 1. Today's metrics
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
    today_pnl = ProfitLossService.calculate_pnl(db=db, from_date=today, to_date=today)

    # 2. Monthly metrics
    month_sales = (
        db.query(func.coalesce(func.sum(SalesInvoice.net_invoice_amount), 0.0))
        .filter(SalesInvoice.invoice_date >= first_day_month, SalesInvoice.status == "Finalized")
        .scalar()
    )
    month_purchases = (
        db.query(func.coalesce(func.sum(PurchaseInvoice.net_purchase_amount), 0.0))
        .filter(PurchaseInvoice.purchase_date >= first_day_month, PurchaseInvoice.status == "Finalized")
        .scalar()
    )
    month_pnl = ProfitLossService.calculate_pnl(db=db, from_date=first_day_month, to_date=today)

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

    # Low stock products count
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

    # 6. Top Selling Products (by quantity)
    top_items = (
        db.query(
            SalesInvoiceItem.product_name,
            func.sum(SalesInvoiceItem.quantity).label("total_qty"),
            func.sum(SalesInvoiceItem.total_amount).label("total_sales")
        )
        .join(SalesInvoice)
        .filter(SalesInvoice.status == "Finalized")
        .group_by(SalesInvoiceItem.product_name)
        .order_by(desc("total_qty"))
        .limit(5)
        .all()
    )
    top_selling = [
        {"product_name": row[0], "total_qty": int(row[1]), "total_sales": round(row[2], 2)}
        for row in top_items
    ]

    return {
        "kpis": {
            "today_sales": round(today_sales, 2),
            "today_purchases": round(today_purchases, 2),
            "today_gross_profit": today_pnl["gross_profit"],
            "today_net_profit": today_pnl["net_profit"],
            "monthly_sales": round(month_sales, 2),
            "monthly_purchases": round(month_purchases, 2),
            "monthly_gross_profit": month_pnl["gross_profit"],
            "monthly_net_profit": month_pnl["net_profit"],
            "total_receivables": round(total_receivables, 2),
            "total_payables": round(total_payables, 2),
            "current_inventory_value": round(current_inventory_value, 2),
            "total_products": total_products,
            "total_stock_qty": total_stock_qty,
            "low_stock_count": low_stock_count,
            "near_expiry_count": near_expiry_count,
            "expired_count": expired_count,
        },
        "recent_sales": recent_sales,
        "recent_purchases": recent_purchases,
        "recent_payments": recent_payments,
        "recent_expenses": recent_expenses,
        "top_selling": top_selling,
        "expense_breakdown": month_pnl["expense_by_category"],
    }
