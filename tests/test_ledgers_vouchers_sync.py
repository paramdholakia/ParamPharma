import unittest
import urllib.request
import json
from backend.app.services.pdf_generator import (
    generate_upi_qr_image,
    generate_ledger_pdf,
    generate_payment_voucher_pdf
)

class TestLedgersVouchersSync(unittest.TestCase):

    def test_universal_gpay_upi_qr(self):
        """Verify Universal Google Pay QR URI generation avoiding 'Invalid UPI ID' rejection."""
        buf = generate_upi_qr_image(
            upi_id="aldholakia72@okicici",
            payee_name="PARAM PHARMA",
            amount=1500.0,
            invoice_number="PP26/1",
            qr_mode="universal"
        )
        self.assertIsNotNone(buf)
        self.assertGreater(len(buf.getvalue()), 500)

    def test_ledger_pdf_generation(self):
        """Verify statutory Statement of Account & Balance Confirmation PDF generation."""
        company = {
            "company_name": "PARAM PHARMA",
            "legal_name": "Param Pharma Wholesale & Distribution",
            "city": "Bhuj, Kutch",
            "state": "Gujarat",
            "pincode": "370001",
            "phone": "9429041051",
            "gstin": "24AABCP1234F1Z5",
            "pan": "AABCP1234F"
        }
        party = {
            "party_name": "Kutch Medical Stores",
            "category": "Chemist",
            "billing_address": "Station Road",
            "city": "Bhuj",
            "state": "Gujarat",
            "pincode": "370001",
            "mobile": "9429041051",
            "gstin": "24ABCDE1234F1Z5"
        }
        entries = [
            {
                "transaction_date": "2026-11-10",
                "reference_type": "Sales Invoice",
                "reference_number": "PP26/1",
                "description": "Amoxicillin 500mg (100 Strips)",
                "debit_amount": 5000.0,
                "credit_amount": 0.0,
                "running_balance": 5000.0
            },
            {
                "transaction_date": "2026-11-11",
                "reference_type": "Payment",
                "reference_number": "RCP26/1",
                "description": "UPI Payment received",
                "debit_amount": 0.0,
                "credit_amount": 3000.0,
                "running_balance": 2000.0
            }
        ]
        summary = {
            "opening_balance": 0.0,
            "total_debit": 5000.0,
            "total_credit": 3000.0,
            "closing_balance": 2000.0
        }
        pdf = generate_ledger_pdf(company, party, entries, summary, party_type="customer")
        self.assertIsNotNone(pdf)
        self.assertTrue(pdf.startswith(b"%PDF"))
        self.assertGreater(len(pdf), 2000)

    def test_payment_voucher_pdf_generation(self):
        """Verify official Receipt Voucher PDF generation."""
        company = {
            "company_name": "PARAM PHARMA",
            "legal_name": "Param Pharma Wholesale & Distribution",
            "city": "Bhuj, Kutch",
            "pincode": "370001",
            "phone": "9429041051"
        }
        party = {
            "party_name": "Kutch Medical Stores",
            "mobile": "9429041051"
        }
        payment = {
            "receipt_number": "RCP26/1",
            "payment_date": "2026-11-12",
            "amount": 3000.0,
            "payment_mode": "UPI",
            "reference_no": "UPI-REF-998811",
            "notes": "Bill settlement"
        }
        pdf = generate_payment_voucher_pdf(company, party, payment, is_customer=True)
        self.assertIsNotNone(pdf)
        self.assertTrue(pdf.startswith(b"%PDF"))
        self.assertGreater(len(pdf), 2000)

    def test_live_api_ledger_and_two_way_sync(self):
        """Verify API endpoints for ledger export and two-way sync on running backend."""
        # 1. Customer Ledger PDF API
        with urllib.request.urlopen("http://127.0.0.1:8000/api/ledgers/customer/1/pdf") as resp:
            self.assertEqual(resp.status, 200)
            data = resp.read()
            self.assertTrue(data.startswith(b"%PDF"))

        # 2. Filtered Customer Ledger PDF API
        with urllib.request.urlopen("http://127.0.0.1:8000/api/ledgers/customer/1/pdf?entry_ids=1") as resp:
            self.assertEqual(resp.status, 200)
            data = resp.read()
            self.assertTrue(data.startswith(b"%PDF"))

        # 3. Two-Way Sync API
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/cloud/sync-both",
            data=b"",
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertTrue(data.get("success"))
            self.assertIn("cluster", data)

if __name__ == "__main__":
    unittest.main()
