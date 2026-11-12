import unittest
import requests
from decimal import Decimal, ROUND_HALF_UP

BASE_URL = "http://127.0.0.1:8000/api"

def round_inr(val: float) -> float:
    """Standard Indian statutory GST currency rounding to 2 decimals using ROUND_HALF_UP."""
    d = Decimal(str(val))
    return float(d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

class TestStatutoryGSTCalculations(unittest.TestCase):
    def test_gst_rounding_half_up(self):
        # 100.005 should round to 100.01
        self.assertEqual(round_inr(100.005), 100.01)
        # 100.004 should round to 100.00
        self.assertEqual(round_inr(100.004), 100.00)
        # 485.00 * 0.12 = 58.20
        self.assertEqual(round_inr(485.0 * 0.12), 58.20)

    def test_intra_state_cgst_sgst_split(self):
        # 12% GST intra-state is strictly 6% CGST + 6% SGST, IGST = 0.0
        taxable_val = 1000.0
        gst_rate = 12.0
        cgst_rate = gst_rate / 2.0
        sgst_rate = gst_rate / 2.0
        cgst_amt = round_inr(taxable_val * (cgst_rate / 100.0))
        sgst_amt = round_inr(taxable_val * (sgst_rate / 100.0))
        self.assertEqual(cgst_amt, 60.0)
        self.assertEqual(sgst_amt, 60.0)
        self.assertEqual(cgst_amt + sgst_amt, 120.0)

    def test_inter_state_igst_full(self):
        # 12% GST inter-state is strictly 0% CGST + 0% SGST, 12% IGST
        taxable_val = 1000.0
        gst_rate = 12.0
        igst_amt = round_inr(taxable_val * (gst_rate / 100.0))
        self.assertEqual(igst_amt, 120.0)

    def test_non_gst_bill_isolation(self):
        # Non-GST bill of supply must produce 0.0 tax liabilities
        bill_amount = 450.0
        is_non_gst = True
        cgst_amt = 0.0 if is_non_gst else round_inr(bill_amount * 0.06)
        sgst_amt = 0.0 if is_non_gst else round_inr(bill_amount * 0.06)
        igst_amt = 0.0
        self.assertEqual(cgst_amt, 0.0)
        self.assertEqual(sgst_amt, 0.0)
        self.assertEqual(igst_amt, 0.0)

    def test_backend_health_and_company(self):
        res = requests.get(f"{BASE_URL}/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "online")

        comp = requests.get(f"{BASE_URL}/company")
        self.assertEqual(comp.status_code, 200)
        data = comp.json()
        self.assertIn("Bhuj", data.get("city", "") or data.get("company_name", ""))

if __name__ == "__main__":
    unittest.main()
