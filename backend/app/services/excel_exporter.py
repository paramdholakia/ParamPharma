import io
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

HEADER_FILL = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
HEADER_FONT = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
TOTAL_FILL = PatternFill(start_color="DBEAFE", end_color="DBEAFE", fill_type="solid")
TOTAL_FONT = Font(name="Calibri", size=11, bold=True, color="1E3A8A")

THIN_BORDER = Border(
    left=Side(style='thin', color='CBD5E1'),
    right=Side(style='thin', color='CBD5E1'),
    top=Side(style='thin', color='CBD5E1'),
    bottom=Side(style='thin', color='CBD5E1')
)

def export_sales_register_excel(invoices: list[dict]) -> bytes:
    """Exports Sales Register to Excel with headers, formatting and totals"""
    wb = Workbook()
    ws = wb.active
    ws.title = "Sales Register"

    headers = [
        "Invoice No", "Date", "Customer Name", "Category", "GSTIN",
        "Gross Sales", "Discount", "Taxable Amount", "CGST", "SGST", "IGST",
        "Total GST", "Invoice Amount", "Paid Amount", "Outstanding", "Status"
    ]
    ws.append(headers)

    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center")

    total_gross = 0.0
    total_taxable = 0.0
    total_gst = 0.0
    total_inv = 0.0
    total_outstanding = 0.0

    for inv in invoices:
        gross = inv.get("total_gross_amount", 0.0)
        taxable = inv.get("total_taxable_amount", 0.0)
        gst = inv.get("total_gst_amount", 0.0)
        net = inv.get("net_invoice_amount", 0.0)
        bal = inv.get("balance_amount", 0.0)

        total_gross += gross
        total_taxable += taxable
        total_gst += gst
        total_inv += net
        total_outstanding += bal

        row = [
            inv.get("invoice_number"),
            str(inv.get("invoice_date")),
            inv.get("customer_name"),
            inv.get("customer_category", ""),
            inv.get("gstin", ""),
            gross,
            inv.get("total_discount_amount", 0.0),
            taxable,
            inv.get("cgst_amount", 0.0),
            inv.get("sgst_amount", 0.0),
            inv.get("igst_amount", 0.0),
            gst,
            net,
            inv.get("paid_amount", 0.0),
            bal,
            inv.get("status")
        ]
        ws.append(row)

    # Append Totals Row
    total_row = [
        "TOTAL", "", "", "", "",
        round(total_gross, 2), "", round(total_taxable, 2), "", "", "",
        round(total_gst, 2), round(total_inv, 2), "", round(total_outstanding, 2), ""
    ]
    ws.append(total_row)
    last_row_idx = ws.max_row
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=last_row_idx, column=col_num)
        cell.fill = TOTAL_FILL
        cell.font = TOTAL_FONT

    # Adjust Column Widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = col[0].column_letter
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def export_purchase_register_excel(purchases: list[dict]) -> bytes:
    """Exports Purchase Register to Excel with headers, formatting and totals"""
    wb = Workbook()
    ws = wb.active
    ws.title = "Purchase Register"

    headers = [
        "Entry No", "Supplier Bill No", "Date", "Supplier Name", "GSTIN",
        "Gross Amount", "Discount", "Taxable Amount", "CGST", "SGST", "IGST",
        "Total GST", "Total Bill", "Paid Amount", "Outstanding", "Status"
    ]
    ws.append(headers)

    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center")

    total_gross = 0.0
    total_taxable = 0.0
    total_gst = 0.0
    total_bill = 0.0
    total_bal = 0.0

    for pur in purchases:
        gross = pur.get("total_gross_amount", 0.0)
        taxable = pur.get("total_taxable_amount", 0.0)
        gst = pur.get("total_gst_amount", 0.0)
        net = pur.get("net_purchase_amount", 0.0)
        bal = pur.get("balance_amount", 0.0)

        total_gross += gross
        total_taxable += taxable
        total_gst += gst
        total_bill += net
        total_bal += bal

        row = [
            pur.get("purchase_entry_number"),
            pur.get("supplier_invoice_number"),
            str(pur.get("purchase_date")),
            pur.get("supplier_name"),
            pur.get("gstin", ""),
            gross,
            pur.get("total_discount_amount", 0.0),
            taxable,
            pur.get("cgst_amount", 0.0),
            pur.get("sgst_amount", 0.0),
            pur.get("igst_amount", 0.0),
            gst,
            net,
            pur.get("paid_amount", 0.0),
            bal,
            pur.get("status")
        ]
        ws.append(row)

    total_row = [
        "TOTAL", "", "", "", "",
        round(total_gross, 2), "", round(total_taxable, 2), "", "", "",
        round(total_gst, 2), round(total_bill, 2), "", round(total_bal, 2), ""
    ]
    ws.append(total_row)
    last_row_idx = ws.max_row
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=last_row_idx, column=col_num)
        cell.fill = TOTAL_FILL
        cell.font = TOTAL_FONT

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = col[0].column_letter
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def export_stock_report_excel(batches: list[dict]) -> bytes:
    """Exports Inventory & Batch-wise Stock Report to Excel"""
    wb = Workbook()
    ws = wb.active
    ws.title = "Inventory Valuation Report"

    headers = [
        "Medicine Name", "Manufacturer", "Packing", "Batch No", "Expiry Date",
        "Purchase Rate", "MRP", "PTR", "Available Stock", "Stock Value (at Cost)", "Alert"
    ]
    ws.append(headers)

    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT

    total_val = 0.0
    total_qty = 0

    for b in batches:
        qty = b.get("available_qty", 0)
        rate = b.get("purchase_rate", 0.0)
        val = round(qty * rate, 2)
        total_qty += qty
        total_val += val

        row = [
            b.get("medicine_name"),
            b.get("manufacturer"),
            b.get("packing"),
            b.get("batch_number"),
            str(b.get("expiry_date")),
            rate,
            b.get("mrp", 0.0),
            b.get("ptr", 0.0),
            qty,
            val,
            b.get("alert_status", "Normal")
        ]
        ws.append(row)

    total_row = [
        "TOTAL", "", "", "", "", "", "", "", total_qty, round(total_val, 2), ""
    ]
    ws.append(total_row)
    last_row_idx = ws.max_row
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=last_row_idx, column=col_num)
        cell.fill = TOTAL_FILL
        cell.font = TOTAL_FONT

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = col[0].column_letter
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
