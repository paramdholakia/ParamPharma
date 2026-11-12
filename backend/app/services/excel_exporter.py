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


def export_invoice_excel(company: dict, invoice: dict, items: list[dict]) -> bytes:
    """
    Exports an authoritative Pharmaceutical Wholesale Invoice to Excel format (.xlsx)
    with styled company header, buyer details, full line item breakdown, GST tax summary,
    and statutory terms & conditions.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = f"Invoice_{str(invoice.get('invoice_number', 'Bill')).replace('/', '_')}"

    # Custom styles
    title_font = Font(name="Calibri", size=15, bold=True, color="1E3A8A")
    doc_type_font = Font(name="Calibri", size=12, bold=True, color="0F172A")
    meta_label_font = Font(name="Calibri", size=10, bold=True, color="334155")
    meta_val_font = Font(name="Calibri", size=10, color="0F172A")
    item_header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    item_header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    total_label_font = Font(name="Calibri", size=10, bold=True, color="0F172A")
    total_val_font = Font(name="Calibri", size=11, bold=True, color="1E3A8A")
    grand_fill = PatternFill(start_color="DBEAFE", end_color="DBEAFE", fill_type="solid")
    terms_font = Font(name="Calibri", size=9, italic=True, color="475569")

    # 1. Company Title Header
    is_non_gst = bool(invoice.get("is_non_gst", False))
    doc_title = "BILL OF SUPPLY / CASH MEMO" if is_non_gst else "TAX INVOICE"

    comp_name = company.get("company_name", "PARAM PHARMA")
    comp_legal = company.get("legal_name", "Param Pharma Wholesale & Distribution")
    comp_addr = f"{company.get('address_line1', '')}, {company.get('city', 'Bhuj, Kutch')} - {company.get('pincode', '370001')}"
    comp_gstin = company.get("gstin", "24AABCP1234F1Z5")
    comp_dl = f"20B: {company.get('dl_number_20b', '')} | 21B: {company.get('dl_number_21b', '')}"
    comp_phone = company.get("phone", "9429041051")

    ws.merge_cells("A1:K1")
    ws["A1"] = comp_name
    ws["A1"].font = title_font

    ws.merge_cells("L1:R1")
    ws["L1"] = doc_title
    ws["L1"].font = doc_type_font
    ws["L1"].alignment = Alignment(horizontal="right")

    ws.merge_cells("A2:K2")
    ws["A2"] = f"{comp_legal} | {comp_addr} | Mob: {comp_phone}"
    ws["A2"].font = meta_val_font

    ws.merge_cells("L2:R2")
    inv_num = invoice.get("invoice_number", "")
    ws["L2"] = f"Invoice No: {inv_num}"
    ws["L2"].font = meta_label_font
    ws["L2"].alignment = Alignment(horizontal="right")

    ws.merge_cells("A3:K3")
    ws["A3"] = f"GSTIN: {comp_gstin} | Drug License: {comp_dl} | PAN: {company.get('pan', '')}"
    ws["A3"].font = meta_val_font

    ws.merge_cells("L3:R3")
    inv_date = str(invoice.get("invoice_date", ""))
    ws["L3"] = f"Invoice Date: {inv_date} | Terms: {invoice.get('payment_terms', '21 Days')}"
    ws["L3"].font = meta_val_font
    ws["L3"].alignment = Alignment(horizontal="right")

    ws.append([])  # Blank row 4

    # 2. Buyer Details (Row 5 & 6)
    cust_name = invoice.get("customer_name", "")
    cust_cat = invoice.get("customer_category", "")
    cust_addr = invoice.get("billing_address", "")
    cust_gstin = invoice.get("gstin") or "URP (Unregistered Person)"
    cust_state = f"{invoice.get('state', 'Gujarat')} ({invoice.get('state_code', '24')})"
    cust_dl = invoice.get("dl_number") or "N/A"

    ws.merge_cells("A5:R5")
    ws["A5"] = f"BILLED TO: {cust_name} ({cust_cat}) | Address: {cust_addr}"
    ws["A5"].font = meta_label_font
    ws["A5"].fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

    ws.merge_cells("A6:R6")
    ws["A6"] = f"State: {cust_state} | GSTIN: {cust_gstin} | DL No: {cust_dl} | Payment Mode: {invoice.get('payment_mode', 'Credit')}"
    ws["A6"].font = meta_val_font

    ws.append([])  # Blank row 7

    # 3. Product Items Table Header (Row 8)
    item_headers = [
        "Sr", "Medicine Description", "Manufacturer", "Pack", "HSN",
        "Batch", "Expiry", "MRP", "Qty", "Free",
        "Rate (PTR)", "Disc %", "Taxable", "GST %", "CGST", "SGST", "IGST", "Line Total"
    ]
    ws.append(item_headers)
    header_row_idx = ws.max_row
    for col_idx in range(1, len(item_headers) + 1):
        cell = ws.cell(row=header_row_idx, column=col_idx)
        cell.fill = item_header_fill
        cell.font = item_header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    # Line item rows
    for idx, it in enumerate(items, 1):
        row_data = [
            idx,
            it.get("product_name"),
            it.get("manufacturer", ""),
            it.get("packing", ""),
            it.get("hsn_code", ""),
            it.get("batch_number", ""),
            str(it.get("expiry_date", "")),
            float(it.get("mrp", 0.0)),
            int(it.get("quantity", 0)),
            int(it.get("free_quantity", 0)),
            float(it.get("rate", 0.0)),
            float(it.get("discount_percent", 0.0)),
            float(it.get("taxable_amount", 0.0)),
            float(it.get("gst_rate", 0.0)),
            float(it.get("cgst_amount", 0.0)),
            float(it.get("sgst_amount", 0.0)),
            float(it.get("igst_amount", 0.0)),
            float(it.get("total_amount", 0.0)),
        ]
        ws.append(row_data)
        curr_row = ws.max_row
        for col_idx in range(1, len(row_data) + 1):
            c = ws.cell(row=curr_row, column=col_idx)
            c.border = THIN_BORDER
            if col_idx in [8, 11, 13, 15, 16, 17, 18]:
                c.number_format = "#,##0.00"
                c.alignment = Alignment(horizontal="right")
            elif col_idx in [1, 9, 10, 12, 14]:
                c.alignment = Alignment(horizontal="center")

    ws.append([])  # Blank spacer

    # 4. Tax & Financial Totals Table
    net_total = float(invoice.get("net_invoice_amount", 0.0))
    cgst_val = float(invoice.get("cgst_amount", 0.0))
    sgst_val = float(invoice.get("sgst_amount", 0.0))
    igst_val = float(invoice.get("igst_amount", 0.0))

    totals_breakdown = [
        ("Total Gross Amount", float(invoice.get("total_gross_amount", 0.0))),
        ("Total Discount", float(invoice.get("total_discount_amount", 0.0))),
        ("Taxable Value", float(invoice.get("total_taxable_amount", 0.0))),
        ("Central GST (CGST)", cgst_val),
        ("State GST (SGST)", sgst_val),
        ("Integrated GST (IGST)", igst_val),
        ("Round Off", float(invoice.get("round_off", 0.0))),
        ("NET INVOICE TOTAL", net_total),
    ]

    for label, val in totals_breakdown:
        ws.append([""] * 15 + [label, "", val])
        r = ws.max_row
        ws.merge_cells(start_row=r, start_column=16, end_row=r, end_column=17)
        lbl_cell = ws.cell(row=r, column=16)
        val_cell = ws.cell(row=r, column=18)
        lbl_cell.font = total_label_font
        val_cell.font = total_val_font
        val_cell.number_format = "#,##0.00"
        val_cell.alignment = Alignment(horizontal="right")
        lbl_cell.border = THIN_BORDER
        val_cell.border = THIN_BORDER
        if label == "NET INVOICE TOTAL":
            lbl_cell.fill = grand_fill
            val_cell.fill = grand_fill

    # 5. Bank Details, UPI & Terms
    ws.append([])
    b_row = ws.max_row + 1
    ws.merge_cells(f"A{b_row}:J{b_row}")
    bank_info = f"Bank Transfer: {company.get('bank_name', 'State Bank of India')} | A/C: {company.get('bank_account_no', '300123456789')} | IFSC: {company.get('bank_ifsc', 'SBIN0001234')} | Branch: {company.get('bank_branch', 'Main Branch')}"
    ws[f"A{b_row}"] = bank_info
    ws[f"A{b_row}"].font = meta_label_font

    u_row = b_row + 1
    ws.merge_cells(f"A{u_row}:J{u_row}")
    active_upi = invoice.get("upi_id") or company.get("upi_id") or "aldholakia72@okicici"
    ws[f"A{u_row}"] = f"UPI Payment Address: {active_upi} (Mobile: {comp_phone})"
    ws[f"A{u_row}"].font = meta_label_font

    t_row = u_row + 1
    ws.merge_cells(f"A{t_row}:R{t_row}")
    ws[f"A{t_row}"] = "Terms & Conditions: 1. Goods once sold will not be taken back without inspection. 2. Interest @ 18% p.a. charged after due date. 3. Subject to Bhuj, Kutch (Gujarat) - 370001 jurisdiction only."
    ws[f"A{t_row}"].font = terms_font

    # Column widths
    col_widths = {
        "A": 6, "B": 28, "C": 18, "D": 12, "E": 12,
        "F": 14, "G": 12, "H": 12, "I": 8, "J": 8,
        "K": 12, "L": 8, "M": 14, "N": 8, "O": 12,
        "P": 12, "Q": 12, "R": 16
    }
    for col_letter, width in col_widths.items():
        ws.column_dimensions[col_letter].width = width

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
