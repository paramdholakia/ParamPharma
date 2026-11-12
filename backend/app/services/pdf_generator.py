import io
from datetime import datetime
import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm

def number_to_words_indian(num: float) -> str:
    """Converts a number to Indian Rupee Words format (e.g. Twelve Thousand Three Hundred...)"""
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
            "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def convert_upto_thousand(n):
        if n == 0:
            return ""
        if n < 20:
            return ones[n]
        if n < 100:
            return tens[n // 10] + (" " + ones[n % 10] if n % 10 != 0 else "")
        return ones[n // 100] + " Hundred" + (" and " + convert_upto_thousand(n % 100) if n % 100 != 0 else "")

    rupees = int(num)
    paise = int(round((num - rupees) * 100))

    if rupees == 0:
        words = "Zero Rupees"
    else:
        crores = rupees // 10000000
        rupees %= 10000000
        lakhs = rupees // 100000
        rupees %= 100000
        thousands = rupees // 1000
        rupees %= 1000
        hundreds = rupees

        parts = []
        if crores > 0:
            parts.append(convert_upto_thousand(crores) + " Crore")
        if lakhs > 0:
            parts.append(convert_upto_thousand(lakhs) + " Lakh")
        if thousands > 0:
            parts.append(convert_upto_thousand(thousands) + " Thousand")
        if hundreds > 0:
            parts.append(convert_upto_thousand(hundreds))
        words = " ".join(parts) + " Rupees"

    if paise > 0:
        words += " and " + convert_upto_thousand(paise) + " Paise"
    return words + " Only"


def generate_upi_qr_image(upi_id: str, payee_name: str, amount: float, invoice_number: str) -> io.BytesIO:
    """Generates an in-memory PNG QR code targeting the given UPI payment address with exact amount."""
    upi_url = f"upi://pay?pa={upi_id}&pn={payee_name.replace(' ', '+')}&am={amount:.2f}&cu=INR&tn=Invoice_{invoice_number}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=4,
        border=1,
    )
    qr.add_data(upi_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def generate_invoice_pdf(company: dict, invoice: dict, items: list[dict], include_qr: bool = True) -> bytes:
    """
    Generates a professional pharmaceutical GST tax invoice in PDF format.
    Strictly calibrated to 194mm printable width on A4 paper with zero overflow.
    Includes big authoritative header, comprehensive drug license details,
    and optional high-contrast dynamic UPI 'Pay Here' QR Code.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=8 * mm,
        rightMargin=8 * mm,
        topMargin=8 * mm,
        bottomMargin=8 * mm
    )

    styles = getSampleStyleSheet()

    company_title = ParagraphStyle(
        "CompanyTitle",
        parent=styles["Normal"],
        fontSize=15,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#0f172a"),
        leading=18,
    )
    company_sub = ParagraphStyle(
        "CompanySub",
        parent=styles["Normal"],
        fontSize=7.5,
        textColor=colors.HexColor("#334155"),
        leading=10.5,
    )
    inv_title_style = ParagraphStyle(
        "InvTitle",
        parent=styles["Normal"],
        fontSize=12,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#0f172a"),
        alignment=2,
        leading=14,
    )
    header_right_style = ParagraphStyle(
        "HeaderRight",
        parent=styles["Normal"],
        fontSize=7.5,
        textColor=colors.HexColor("#1e293b"),
        alignment=2,
        leading=10.5,
    )
    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontSize=7,
        fontName="Helvetica-Bold",
        leading=8.5,
    )
    cell_normal = ParagraphStyle(
        "CellNormal",
        parent=styles["Normal"],
        fontSize=6.5,
        leading=8,
    )
    cell_right = ParagraphStyle(
        "CellRight",
        parent=styles["Normal"],
        fontSize=6.5,
        alignment=2,
        leading=8,
    )
    cell_right_bold = ParagraphStyle(
        "CellRightBold",
        parent=styles["Normal"],
        fontSize=7,
        fontName="Helvetica-Bold",
        alignment=2,
        leading=8.5,
    )
    qr_text_style = ParagraphStyle(
        "QRTextStyle",
        parent=styles["Normal"],
        fontSize=6,
        leading=7.5,
        alignment=1,  # Centered
        textColor=colors.HexColor("#0f172a"),
    )

    story = []

    # 1. Authoritative Big Header
    comp_name = company.get("company_name") or "PARAM PHARMA WHOLESALE"
    legal_name = company.get("legal_name") or ""
    dl_20b = company.get("dl_number_20b") or "GJ-SUR-20B-184920"
    dl_21b = company.get("dl_number_21b") or "GJ-SUR-21B-184921"
    fssai = company.get("fssai_number") or ""
    pan = company.get("pan") or ""
    gstin = company.get("gstin") or ""
    phone = company.get("phone") or ""
    email = company.get("email") or ""
    addr1 = company.get("address_line1") or ""
    addr2 = company.get("address_line2") or ""
    city = company.get("city") or "Surat"
    state = company.get("state") or "Gujarat"
    pincode = company.get("pincode") or ""
    state_code = company.get("state_code") or "24"

    company_html = f"""
    <font size="14"><b>{comp_name.upper()}</b></font><br/>
    {f'<b>{legal_name}</b><br/>' if legal_name and legal_name != comp_name else ''}
    {addr1}{', ' + addr2 if addr2 else ''}<br/>
    {city} - {pincode}, {state} (State Code: <b>{state_code}</b>)<br/>
    Phone: <b>{phone}</b> | Email: {email}<br/>
    <b>GSTIN:</b> {gstin} | <b>PAN:</b> {pan}<br/>
    <b>D.L. No. (20B):</b> {dl_20b} | <b>(21B):</b> {dl_21b} {f'| <b>FSSAI:</b> {fssai}' if fssai else ''}
    """

    inv_num = invoice.get("invoice_number", "")
    inv_date_raw = str(invoice.get("invoice_date", ""))
    # Format date as DD/Mon/YYYY
    try:
        dt = datetime.strptime(inv_date_raw.split("T")[0], "%Y-%m-%d")
        inv_date_display = dt.strftime("%d/%b/%Y")
    except Exception:
        inv_date_display = inv_date_raw

    payment_mode = invoice.get("payment_mode", "Credit")
    payment_terms = invoice.get("payment_terms", "21 Days")
    pos = invoice.get("place_of_supply", state)

    inv_meta_html = f"""
    <font size="11"><b>TAX INVOICE</b></font><br/>
    <font size="6.5" color="#64748b">ORIGINAL FOR RECIPIENT</font><br/><br/>
    <b>Invoice No:</b> <font color="#0f172a"><b>{inv_num}</b></font><br/>
    <b>Invoice Date:</b> {inv_date_display}<br/>
    <b>Payment Mode:</b> {payment_mode}<br/>
    <b>Payment Terms:</b> {payment_terms}<br/>
    <b>Place of Supply:</b> {pos} ({state_code})
    """

    header_table = Table(
        [[Paragraph(company_html, company_sub), Paragraph(inv_meta_html, header_right_style)]],
        colWidths=[124 * mm, 70 * mm]
    )
    header_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1.2, colors.HexColor("#0f172a")),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 2 * mm))

    # 2. Buyer / Customer Information
    cust_name = invoice.get("customer_name", "")
    cust_cat = invoice.get("customer_category", "Retailer / Chemist")
    cust_addr = invoice.get("billing_address", "")
    cust_gstin = invoice.get("gstin") or "URP (Unregistered Person)"
    cust_pan = invoice.get("pan") or "N/A"
    cust_dl = invoice.get("dl_number") or "N/A"
    cust_state = invoice.get("state", state)
    cust_state_code = invoice.get("state_code", state_code)

    cust_html = f"""
    <b>BUYER / BILLED TO:</b> <b>{cust_name}</b> ({cust_cat})<br/>
    <b>Address:</b> {cust_addr}<br/>
    <b>State:</b> {cust_state} (Code: <b>{cust_state_code}</b>) | <b>GSTIN:</b> {cust_gstin} | <b>PAN:</b> {cust_pan} | <b>Drug License:</b> {cust_dl}
    """

    buyer_table = Table(
        [[Paragraph(cust_html, company_sub)]],
        colWidths=[194 * mm]
    )
    buyer_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor("#0f172a")),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#ffffff")),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(buyer_table)
    story.append(Spacer(1, 2 * mm))

    # 3. Product Items Table
    # Strict column widths summing to 194 mm:
    # 6 + 46 + 12 + 13 + 15 + 12 + 13 + 9 + 8 + 13 + 9 + 14 + 8 + 16 = 194 mm
    headers = [
        Paragraph("Sr", cell_bold),
        Paragraph("Product / Medicine Description", cell_bold),
        Paragraph("Pack", cell_bold),
        Paragraph("HSN", cell_bold),
        Paragraph("Batch", cell_bold),
        Paragraph("Exp", cell_bold),
        Paragraph("MRP", cell_right_bold),
        Paragraph("Qty", cell_right_bold),
        Paragraph("Free", cell_right_bold),
        Paragraph("Rate", cell_right_bold),
        Paragraph("Disc%", cell_right_bold),
        Paragraph("Taxable", cell_right_bold),
        Paragraph("GST%", cell_right_bold),
        Paragraph("Amount", cell_right_bold),
    ]

    col_widths = [
        6 * mm, 46 * mm, 12 * mm, 13 * mm, 15 * mm, 12 * mm,
        13 * mm, 9 * mm, 8 * mm, 13 * mm, 9 * mm, 14 * mm, 8 * mm, 16 * mm
    ]

    table_data = [headers]
    for idx, it in enumerate(items, 1):
        exp_str = str(it.get("expiry_date", ""))
        if len(exp_str) >= 7:
            parts = exp_str.split("-")
            exp_display = f"{parts[1]}/{parts[0][2:]}" if len(parts) >= 2 else exp_str
        else:
            exp_display = exp_str

        p_name = it.get("product_name", "")
        mfr = it.get("manufacturer", "")
        desc_cell = f"<b>{p_name}</b>"
        if mfr:
            desc_cell += f"<br/><font color='#64748b' size='5.5'>{mfr}</font>"

        row = [
            Paragraph(str(idx), cell_normal),
            Paragraph(desc_cell, cell_normal),
            Paragraph(str(it.get("packing", "")), cell_normal),
            Paragraph(str(it.get("hsn_code", "")), cell_normal),
            Paragraph(str(it.get("batch_number", "")), cell_normal),
            Paragraph(exp_display, cell_normal),
            Paragraph(f"{it.get('mrp', 0):.2f}", cell_right),
            Paragraph(str(it.get("quantity", 0)), cell_right),
            Paragraph(str(it.get("free_quantity", 0)), cell_right),
            Paragraph(f"{it.get('rate', 0):.2f}", cell_right),
            Paragraph(f"{it.get('discount_percent', 0):.1f}%", cell_right),
            Paragraph(f"{it.get('taxable_amount', 0):.2f}", cell_right),
            Paragraph(f"{it.get('gst_rate', 0):.0f}%", cell_right),
            Paragraph(f"{it.get('total_amount', 0):.2f}", cell_right),
        ]
        table_data.append(row)

    items_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    items_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor("#0f172a")),
        ('INNERGRID', (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 2 * mm))

    # 4. Totals, GST Breakdown, Amount in Words & UPI QR
    net_total = float(invoice.get("net_invoice_amount", 0.0))
    words = number_to_words_indian(net_total)

    bank_name = company.get("bank_name", "HDFC Bank")
    bank_branch = company.get("bank_branch", "Ring Road, Surat")
    bank_acc = company.get("bank_account_no", "50200084920192")
    bank_ifsc = company.get("bank_ifsc", "HDFC0001234")
    raw_terms = company.get("terms_conditions", "1. Goods once sold will not be taken back.\n2. Subject to Surat jurisdiction.")

    footer_left_html = f"""
    <b>Amount Chargeable (in words):</b><br/>
    <font color="#0f172a"><b>{words}</b></font><br/><br/>
    <b>Bank Transfer Details:</b><br/>
    Bank: <b>{bank_name}</b> | Branch: {bank_branch}<br/>
    A/C No: <b>{bank_acc}</b> | IFSC: <b>{bank_ifsc}</b><br/><br/>
    <b>Terms & Conditions:</b><br/>
    <font size="5.5" color="#475569">{raw_terms.replace(chr(10), '<br/>')}</font>
    """

    cgst_val = float(invoice.get("cgst_amount", 0.0))
    sgst_val = float(invoice.get("sgst_amount", 0.0))
    igst_val = float(invoice.get("igst_amount", 0.0))

    footer_right_content = [
        [Paragraph("Gross Amount:", cell_normal), Paragraph(f"Rs. {invoice.get('total_gross_amount', 0):.2f}", cell_right)],
        [Paragraph("Total Discount:", cell_normal), Paragraph(f"Rs. {invoice.get('total_discount_amount', 0):.2f}", cell_right)],
        [Paragraph("Taxable Value:", cell_bold), Paragraph(f"Rs. {invoice.get('total_taxable_amount', 0):.2f}", cell_right_bold)],
    ]

    if igst_val > 0:
        footer_right_content.append([Paragraph("Integrated GST (IGST):", cell_normal), Paragraph(f"Rs. {igst_val:.2f}", cell_right)])
    else:
        footer_right_content.append([Paragraph("Central GST (CGST):", cell_normal), Paragraph(f"Rs. {cgst_val:.2f}", cell_right)])
        footer_right_content.append([Paragraph("State GST (SGST):", cell_normal), Paragraph(f"Rs. {sgst_val:.2f}", cell_right)])

    footer_right_content.extend([
        [Paragraph("Round Off:", cell_normal), Paragraph(f"Rs. {invoice.get('round_off', 0):.2f}", cell_right)],
        [Paragraph("<b>NET INVOICE TOTAL:</b>", cell_bold), Paragraph(f"<b>Rs. {net_total:.2f}</b>", cell_right_bold)],
    ])

    footer_right_table = Table(footer_right_content, colWidths=[38 * mm, 32 * mm])
    footer_right_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor("#0f172a")),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0, 0), (-1, -1), 0.2, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]))

    sig_html = f"""
    <br/><br/>
    For <b>{comp_name}</b><br/><br/><br/>
    <b>Authorized Signatory</b>
    """

    # Check UPI QR toggle
    # User specified UPI ID: aldholakia72-1@okaxis (Mobile: 9429041051)
    # Check if toggle is active on invoice or passed parameter
    qr_active = include_qr and invoice.get("include_upi_qr", True)
    if qr_active:
        qr_buf = generate_upi_qr_image(
            upi_id="aldholakia72-1@okaxis",
            payee_name=comp_name,
            amount=net_total,
            invoice_number=inv_num
        )
        rl_qr_img = RLImage(qr_buf, width=24 * mm, height=24 * mm)
        qr_caption = Paragraph("<b>SCAN & PAY VIA UPI</b><br/>GPay | PhonePe | Paytm<br/><b>aldholakia72-1@okaxis</b><br/>Mob: 9429041051", qr_text_style)

        qr_box = Table(
            [[rl_qr_img], [qr_caption]],
            colWidths=[28 * mm]
        )
        qr_box.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor("#0f172a")),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#ffffff")),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ]))

        # 3 columns in summary table: left text, qr box, right calculations & sig
        summary_table = Table(
            [[
                Paragraph(footer_left_html, company_sub),
                qr_box,
                [footer_right_table, Paragraph(sig_html, header_right_style)]
            ]],
            colWidths=[92 * mm, 30 * mm, 72 * mm]
        )
    else:
        # 2 columns in summary table: left text, right calculations & sig
        summary_table = Table(
            [[
                Paragraph(footer_left_html, company_sub),
                [footer_right_table, Paragraph(sig_html, header_right_style)]
            ]],
            colWidths=[122 * mm, 72 * mm]
        )

    summary_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor("#0f172a")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))

    story.append(summary_table)

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
