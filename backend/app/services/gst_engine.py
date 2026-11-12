import re
from typing import Dict, Any, Tuple

# Indian GSTIN Regex: 2 digits state code + 5 letters PAN + 4 digits PAN + 1 letter PAN + 1 entity code + 'Z' + 1 check digit
GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")

# Indian State Codes Mapping
STATE_CODES = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
    "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
    "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
    "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra", "28": "Andhra Pradesh (Old)",
    "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
    "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar", "36": "Telangana",
    "37": "Andhra Pradesh (New)", "38": "Ladakh"
}

def validate_gstin(gstin: str) -> Tuple[bool, str]:
    """Validates an Indian GSTIN format and returns (is_valid, state_code)"""
    if not gstin:
        return True, ""  # Unregistered party is allowed
    clean_gstin = gstin.strip().upper()
    if not GSTIN_REGEX.match(clean_gstin):
        return False, "Invalid GSTIN format. Must be 15 characters (e.g., 24AABCP1234F1Z5)"
    state_code = clean_gstin[:2]
    if state_code not in STATE_CODES:
        return False, f"Invalid State Code '{state_code}' in GSTIN."
    return True, state_code


def is_interstate_transaction(company_state_code: str, party_state_code: str) -> bool:
    """Returns True if inter-state (IGST), False if intra-state (CGST + SGST)"""
    if not party_state_code:
        return False
    return str(company_state_code).strip() != str(party_state_code).strip()


def calculate_line_item_gst(
    quantity: int,
    rate: float,
    discount_percent: float,
    gst_rate: float,
    is_interstate: bool
) -> Dict[str, float]:
    """
    Computes mathematically rigorous GST for a line item.
    Supports Scheme Free quantity (billed quantity is priced; free items are accounted in inventory).
    Returns accurate line item breakdown rounded to 2 decimal places.
    """
    quantity = max(0, quantity)
    rate = max(0.0, rate)
    discount_percent = max(0.0, min(100.0, discount_percent))
    gst_rate = max(0.0, gst_rate)

    gross_amount = round(quantity * rate, 2)
    discount_amount = round((gross_amount * discount_percent) / 100.0, 2)
    taxable_amount = round(gross_amount - discount_amount, 2)

    if is_interstate:
        cgst_rate = 0.0
        cgst_amount = 0.0
        sgst_rate = 0.0
        sgst_amount = 0.0
        igst_rate = gst_rate
        igst_amount = round((taxable_amount * igst_rate) / 100.0, 2)
    else:
        cgst_rate = round(gst_rate / 2.0, 2)
        cgst_amount = round((taxable_amount * cgst_rate) / 100.0, 2)
        sgst_rate = round(gst_rate / 2.0, 2)
        sgst_amount = round((taxable_amount * sgst_rate) / 100.0, 2)
        igst_rate = 0.0
        igst_amount = 0.0

    total_gst = round(cgst_amount + sgst_amount + igst_amount, 2)
    total_amount = round(taxable_amount + total_gst, 2)

    return {
        "gross_amount": gross_amount,
        "discount_amount": discount_amount,
        "taxable_amount": taxable_amount,
        "gst_rate": gst_rate,
        "cgst_rate": cgst_rate,
        "cgst_amount": cgst_amount,
        "sgst_rate": sgst_rate,
        "sgst_amount": sgst_amount,
        "igst_rate": igst_rate,
        "igst_amount": igst_amount,
        "total_gst": total_gst,
        "total_amount": total_amount,
    }


def calculate_invoice_totals(items_breakdown: list[Dict[str, Any]]) -> Dict[str, float]:
    """
    Aggregates invoice items with standard Indian rounding rules (round to nearest rupee).
    """
    total_gross = sum(item["gross_amount"] for item in items_breakdown)
    total_discount = sum(item["discount_amount"] for item in items_breakdown)
    total_taxable = sum(item["taxable_amount"] for item in items_breakdown)
    cgst_amount = sum(item["cgst_amount"] for item in items_breakdown)
    sgst_amount = sum(item["sgst_amount"] for item in items_breakdown)
    igst_amount = sum(item["igst_amount"] for item in items_breakdown)
    total_gst = cgst_amount + sgst_amount + igst_amount

    raw_net = total_taxable + total_gst
    net_rounded = round(raw_net)
    round_off = round(net_rounded - raw_net, 2)

    return {
        "total_gross_amount": round(total_gross, 2),
        "total_discount_amount": round(total_discount, 2),
        "total_taxable_amount": round(total_taxable, 2),
        "cgst_amount": round(cgst_amount, 2),
        "sgst_amount": round(sgst_amount, 2),
        "igst_amount": round(igst_amount, 2),
        "total_gst_amount": round(total_gst, 2),
        "round_off": round_off,
        "net_invoice_amount": float(net_rounded),
    }
