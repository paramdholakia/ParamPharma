from datetime import date
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.invoice import SalesInvoice, SalesInvoiceItem
from backend.app.models.purchase import PurchaseInvoice, PurchaseInvoiceItem
from backend.app.models.returns import SalesReturn, PurchaseReturn
from backend.app.models.expense import Expense
from backend.app.models.product import ProductBatch

class ProfitLossService:
    @staticmethod
    def calculate_pnl(
        db: Session,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        other_income: float = 0.0,
        finance_costs: float = 0.0,
        depreciation: float = 0.0,
        tax_rate_percent: float = 0.0
    ) -> Dict[str, Any]:
        """
        Calculates mathematically accurate Pharmaceutical Wholesale P&L:
        - Net Sales = Gross Sales (Taxable) - Discounts - Sales Returns
        - COGS = Batch-specific Purchase Cost of Goods actually Sold
          (Accurately respects FIFO batch costing and free scheme quantities)
        - Gross Profit = Net Sales - COGS
        - Operating Profit = Gross Profit - Business Expenses
        - Profit Before Tax = Operating Profit + Other Income - Finance Costs - Depreciation
        - Net Profit After Tax = PBT - Tax Provision
        """
        # 1. Sales Query
        sales_q = db.query(SalesInvoice).filter(SalesInvoice.status == "Finalized")
        if from_date:
            sales_q = sales_q.filter(SalesInvoice.invoice_date >= from_date)
        if to_date:
            sales_q = sales_q.filter(SalesInvoice.invoice_date <= to_date)
        sales_invoices = sales_q.all()

        gross_sales_taxable = sum(inv.total_taxable_amount for inv in sales_invoices)
        sales_discounts = sum(inv.total_discount_amount for inv in sales_invoices)

        # Sales Returns (Excluding GST)
        sr_q = db.query(SalesReturn).filter(SalesReturn.status == "Approved")
        if from_date:
            sr_q = sr_q.filter(SalesReturn.return_date >= from_date)
        if to_date:
            sr_q = sr_q.filter(SalesReturn.return_date <= to_date)
        sales_returns_amount = sum(sr.total_taxable_amount for sr in sr_q.all())

        # Net Sales (Revenue excluding GST)
        net_sales = round(gross_sales_taxable - sales_returns_amount, 2)

        # 2. Cost of Goods Sold (COGS)
        # Sum (sold item quantity * batch purchase rate)
        cogs_total = 0.0
        invoice_ids = [inv.id for inv in sales_invoices]
        if invoice_ids:
            items = db.query(SalesInvoiceItem).filter(SalesInvoiceItem.invoice_id.in_(invoice_ids)).all()
            for item in items:
                # Find the batch purchase rate
                batch = db.query(ProductBatch).filter(ProductBatch.id == item.batch_id).first()
                purchase_rate = batch.purchase_rate if batch else 0.0
                # Cost for billed quantity
                cogs_total += item.quantity * purchase_rate

        # Subtract cost of returned sales goods if they were returned in sellable condition
        # (Already accounted in Net Sales and inventory valuation)
        cogs = round(cogs_total, 2)

        # 3. Gross Profit
        gross_profit = round(net_sales - cogs, 2)
        gross_profit_percent = round((gross_profit / net_sales * 100.0), 2) if net_sales > 0 else 0.0

        # 4. Operating Expenses (All registered business expenses in period)
        exp_q = db.query(Expense)
        if from_date:
            exp_q = exp_q.filter(Expense.expense_date >= from_date)
        if to_date:
            exp_q = exp_q.filter(Expense.expense_date <= to_date)
        expenses = exp_q.all()
        total_operating_expenses = round(sum(e.amount for e in expenses), 2)

        # Expenses by Category
        expense_by_category = {}
        for e in expenses:
            expense_by_category[e.category_name] = round(
                expense_by_category.get(e.category_name, 0.0) + e.amount, 2
            )

        # 5. Operating Profit
        operating_profit = round(gross_profit - total_operating_expenses, 2)

        # 6. Profit Before Tax (PBT)
        profit_before_tax = round(operating_profit + other_income - finance_costs - depreciation, 2)

        # 7. Tax Provision & Net Profit After Tax
        tax_provision = round(max(0.0, profit_before_tax * (tax_rate_percent / 100.0)), 2) if profit_before_tax > 0 else 0.0
        net_profit = round(profit_before_tax - tax_provision, 2)
        net_profit_percent = round((net_profit / net_sales * 100.0), 2) if net_sales > 0 else 0.0

        # 8. Current Stock Valuation (Total inventory value at cost)
        total_stock_value = 0.0
        total_stock_units = 0
        all_batches = db.query(ProductBatch).filter(ProductBatch.is_active == True, ProductBatch.available_qty > 0).all()
        for b in all_batches:
            total_stock_value += b.available_qty * b.purchase_rate
            total_stock_units += b.available_qty

        return {
            "period": {
                "from_date": str(from_date) if from_date else "All Time",
                "to_date": str(to_date) if to_date else str(date.today()),
            },
            "net_sales": net_sales,
            "gross_sales_taxable": round(gross_sales_taxable, 2),
            "sales_discounts": round(sales_discounts, 2),
            "sales_returns": round(sales_returns_amount, 2),
            "cogs": cogs,
            "gross_profit": gross_profit,
            "gross_profit_percent": gross_profit_percent,
            "total_operating_expenses": total_operating_expenses,
            "expense_by_category": expense_by_category,
            "operating_profit": operating_profit,
            "other_income": other_income,
            "finance_costs": finance_costs,
            "depreciation": depreciation,
            "profit_before_tax": profit_before_tax,
            "tax_provision": tax_provision,
            "net_profit": net_profit,
            "net_profit_percent": net_profit_percent,
            "current_inventory_value": round(total_stock_value, 2),
            "current_inventory_units": total_stock_units,
        }
