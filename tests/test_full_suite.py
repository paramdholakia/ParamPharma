import unittest
import requests
import json
from datetime import date, timedelta

BASE_URL = "http://127.0.0.1:8000/api"

class TestParamPharmaERP(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Health check
        res = requests.get(f"{BASE_URL}/health")
        assert res.status_code == 200, "Backend server is not running"

    def test_01_create_customer(self):
        payload = {
            "party_name": "Test Chemist Medical Store",
            "customer_category": "Chemist",
            "contact_person": "Pravin Bhai",
            "mobile": "9825199999",
            "billing_address": "Opp Civil Hospital Gate 2",
            "gstin": "24AAECP1122D1Z3",
            "pan": "AAECP1122D",
            "dl_number": "GJ-AHM-20B-99887",
            "state": "Gujarat",
            "state_code": "24",
            "city": "Ahmedabad",
            "opening_balance": 5000.0,
            "credit_limit": 100000.0,
            "payment_terms_days": 21
        }
        res = requests.post(f"{BASE_URL}/customers", json=payload)
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertEqual(data["party_name"], payload["party_name"])
        self.assertEqual(data["current_balance"], 5000.0)
        TestParamPharmaERP.test_customer_id = data["id"]

    def test_02_create_supplier(self):
        payload = {
            "supplier_name": "Torrent Pharmaceuticals Depot",
            "contact_person": "Vipul Mehta",
            "mobile": "9898011111",
            "email": "depot@torrentpharma.com",
            "address": "Indrad GIDC, Mehsana Highway",
            "gstin": "24AAACT1234F1Z1",
            "pan": "AAACT1234F",
            "dl_number": "GJ-MEH-20B-55443",
            "state": "Gujarat",
            "state_code": "24",
            "city": "Ahmedabad",
            "opening_balance": 10000.0,
            "credit_terms_days": 30
        }
        res = requests.post(f"{BASE_URL}/suppliers", json=payload)
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertEqual(data["supplier_name"], payload["supplier_name"])
        self.assertEqual(data["current_balance"], 10000.0)
        TestParamPharmaERP.test_supplier_id = data["id"]

    def test_03_add_medicine(self):
        payload = {
            "medicine_name": "Chymoral Forte Tablet",
            "generic_name": "Trypsin + Chymotrypsin",
            "brand_name": "Chymoral",
            "manufacturer": "Torrent Pharma",
            "hsn_code": "30049099",
            "packing": "20 Tablets / Strip",
            "unit": "STRIP",
            "mrp": 485.0,
            "ptr": 346.43,
            "pts": 311.78,
            "gst_rate": 12.0,
            "min_stock_level": 25,
            "reorder_level": 50,
            "status": "Active"
        }
        res = requests.post(f"{BASE_URL}/products", json=payload)
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertEqual(data["medicine_name"], payload["medicine_name"])
        TestParamPharmaERP.test_product_id = data["id"]

    def test_04_05_purchase_invoice_and_auto_stock_increase(self):
        exp_date = (date.today() + timedelta(days=365)).strftime("%Y-%m-%d")
        payload = {
            "supplier_id": TestParamPharmaERP.test_supplier_id,
            "supplier_invoice_number": f"TORR-INV-{int(date.today().strftime('%m%d%H%M'))}",
            "purchase_date": date.today().strftime("%Y-%m-%d"),
            "payment_terms": "30 Days",
            "paid_amount": 0.0,
            "status": "Finalized",
            "items": [
                {
                    "product_id": TestParamPharmaERP.test_product_id,
                    "batch_number": "CF26T01",
                    "expiry_date": exp_date,
                    "mrp": 485.0,
                    "purchase_rate": 300.0,
                    "quantity": 100,
                    "free_quantity": 10, # 100 + 10 Free Scheme
                    "discount_percent": 5.0,
                    "gst_rate": 12.0
                }
            ]
        }
        res = requests.post(f"{BASE_URL}/purchases", json=payload)
        self.assertEqual(res.status_code, 200, res.text)
        pur_data = res.json()["purchase"]
        TestParamPharmaERP.test_purchase_id = pur_data["id"]

        # Check Stock increased by 100 billed + 10 free = 110 units!
        batch_res = requests.get(f"{BASE_URL}/products/{TestParamPharmaERP.test_product_id}/batches")
        self.assertEqual(batch_res.status_code, 200)
        batches = batch_res.json()
        cf_batch = next((b for b in batches if b["batch_number"] == "CF26T01"), None)
        self.assertIsNotNone(cf_batch)
        self.assertEqual(cf_batch["available_qty"], 110)
        self.assertEqual(cf_batch["free_purchased_qty"], 10)
        TestParamPharmaERP.test_batch_id = cf_batch["id"]

    def test_06_07_08_sales_invoice_stock_and_free_deduction(self):
        # Sell 20 billed + 2 free = 22 units total stock reduction
        payload = {
            "customer_id": TestParamPharmaERP.test_customer_id,
            "invoice_date": date.today().strftime("%Y-%m-%d"),
            "payment_terms": "21 Days",
            "payment_mode": "Credit",
            "paid_amount": 1000.0, # Partial payment
            "status": "Finalized",
            "items": [
                {
                    "product_id": TestParamPharmaERP.test_product_id,
                    "batch_id": TestParamPharmaERP.test_batch_id,
                    "quantity": 20,
                    "free_quantity": 2, # Scheme free
                    "rate": 346.43,
                    "discount_percent": 2.0
                }
            ]
        }
        res = requests.post(f"{BASE_URL}/sales", json=payload)
        self.assertEqual(res.status_code, 200, res.text)
        inv = res.json()["invoice"]
        TestParamPharmaERP.test_invoice_id = inv["id"]
        TestParamPharmaERP.test_invoice_number = inv["invoice_number"]

        # Stock check: 110 - 22 = 88 available
        batch_res = requests.get(f"{BASE_URL}/products/{TestParamPharmaERP.test_product_id}/batches")
        batches = batch_res.json()
        cf_batch = next((b for b in batches if b["id"] == TestParamPharmaERP.test_batch_id), None)
        self.assertEqual(cf_batch["available_qty"], 88)
        self.assertEqual(cf_batch["sold_qty"], 20)
        self.assertEqual(cf_batch["free_sold_qty"], 2)

    def test_09_10_11_gst_calculations_intra_and_interstate(self):
        # Customer 1 is in Gujarat (State Code 24) -> Intra-state (CGST + SGST, IGST = 0)
        inv_res = requests.get(f"{BASE_URL}/sales/{TestParamPharmaERP.test_invoice_id}")
        self.assertEqual(inv_res.status_code, 200)
        inv_data = inv_res.json()["invoice"]
        self.assertFalse(inv_data["is_interstate"])
        self.assertGreater(inv_data["cgst_amount"], 0)
        self.assertGreater(inv_data["sgst_amount"], 0)
        self.assertEqual(inv_data["igst_amount"], 0.0)

        # Inter-state test with Customer (Maharashtra - 27)
        cust_list = requests.get(f"{BASE_URL}/customers?search=Maharashtra").json().get("customers", [])
        if len(cust_list) == 0:
            maha_cust = requests.post(f"{BASE_URL}/customers", json={
                "party_name": "Maharashtra Care Chemist",
                "customer_category": "Wholesaler",
                "contact_person": "Vijay Deshmukh",
                "mobile": "9822055667",
                "email": "mahacare@yahoo.com",
                "billing_address": "Shop 10, Dadar Pharma Market",
                "gstin": "27AABCM6677K1Z4",
                "pan": "AABCM6677K",
                "dl_number": "MH-MUM-20B-33412",
                "state": "Maharashtra",
                "state_code": "27",
                "city": "Mumbai",
                "pincode": "400014",
                "opening_balance": 0.0,
                "credit_limit": 150000.0,
                "payment_terms_days": 21
            }).json()
        else:
            maha_cust = cust_list[0]
        payload = {
            "customer_id": maha_cust["id"],
            "invoice_date": date.today().strftime("%Y-%m-%d"),
            "payment_terms": "21 Days",
            "payment_mode": "Credit",
            "paid_amount": 0.0,
            "status": "Finalized",
            "items": [
                {
                    "product_id": TestParamPharmaERP.test_product_id,
                    "batch_id": TestParamPharmaERP.test_batch_id,
                    "quantity": 10,
                    "free_quantity": 0,
                    "rate": 346.43,
                    "discount_percent": 0.0
                }
            ]
        }
        inter_res = requests.post(f"{BASE_URL}/sales", json=payload)
        self.assertEqual(inter_res.status_code, 200)
        inter_inv = inter_res.json()["invoice"]
        self.assertTrue(inter_inv["is_interstate"])
        self.assertEqual(inter_inv["cgst_amount"], 0.0)
        self.assertEqual(inter_inv["sgst_amount"], 0.0)
        self.assertGreater(inter_inv["igst_amount"], 0.0)

    def test_12_generate_pdf_invoice(self):
        res = requests.get(f"{BASE_URL}/sales/{TestParamPharmaERP.test_invoice_id}/pdf")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("content-type"), "application/pdf")
        self.assertGreater(len(res.content), 1000)

    def test_13_14_record_partial_payment_and_ledger_update(self):
        # Record payment against Customer
        payload = {
            "customer_id": TestParamPharmaERP.test_customer_id,
            "amount": 2500.0,
            "payment_date": date.today().strftime("%Y-%m-%d"),
            "payment_mode": "Bank Transfer",
            "reference_no": "NEFT12345678",
            "bank_name": "HDFC Bank",
            "invoice_id": TestParamPharmaERP.test_invoice_id,
            "notes": "Partial NEFT settlement"
        }
        res = requests.post(f"{BASE_URL}/payments/customer", json=payload)
        self.assertEqual(res.status_code, 200)

        # Verify ledger has the payment
        ledger_res = requests.get(f"{BASE_URL}/ledgers/customer/{TestParamPharmaERP.test_customer_id}")
        self.assertEqual(ledger_res.status_code, 200)
        entries = ledger_res.json()["entries"]
        pay_entry = next((e for e in entries if "NEFT12345678" in (e["description"] or "")), None)
        self.assertIsNotNone(pay_entry)
        self.assertEqual(pay_entry["credit_amount"], 2500.0)

    def test_15_16_returns_management_and_inspection_approval(self):
        # 1. Customer returns 2 units (1 Sellable, 1 Damaged)
        payload = {
            "customer_id": TestParamPharmaERP.test_customer_id,
            "original_invoice_id": TestParamPharmaERP.test_invoice_id,
            "original_invoice_number": TestParamPharmaERP.test_invoice_number,
            "return_date": date.today().strftime("%Y-%m-%d"),
            "return_reason": "Patient returned excess pack",
            "items": [
                {
                    "product_id": TestParamPharmaERP.test_product_id,
                    "batch_id": TestParamPharmaERP.test_batch_id,
                    "product_name": "Chymoral Forte Tablet",
                    "batch_number": "CF26T01",
                    "quantity": 1,
                    "rate": 346.43,
                    "gst_rate": 12.0,
                    "condition": "Sellable"
                }
            ]
        }
        res = requests.post(f"{BASE_URL}/returns/sales", json=payload)
        self.assertEqual(res.status_code, 200)
        ret_id = res.json()["return"]["id"]

        # Before inspection, stock must NOT increase
        batch_res1 = requests.get(f"{BASE_URL}/products/{TestParamPharmaERP.test_product_id}/batches").json()
        b1 = next(b for b in batch_res1 if b["id"] == TestParamPharmaERP.test_batch_id)
        stock_before = b1["available_qty"]

        # 2. Approve inspection
        app_res = requests.post(f"{BASE_URL}/returns/sales/{ret_id}/approve")
        self.assertEqual(app_res.status_code, 200)

        # After inspection, sellable item must increase stock by 1
        batch_res2 = requests.get(f"{BASE_URL}/products/{TestParamPharmaERP.test_product_id}/batches").json()
        b2 = next(b for b in batch_res2 if b["id"] == TestParamPharmaERP.test_batch_id)
        self.assertEqual(b2["available_qty"], stock_before + 1)

    def test_17_18_sales_and_purchase_registers(self):
        s_res = requests.get(f"{BASE_URL}/registers/sales")
        self.assertEqual(s_res.status_code, 200)
        self.assertGreater(s_res.json()["summary"]["invoice_count"], 0)

        p_res = requests.get(f"{BASE_URL}/registers/purchases")
        self.assertEqual(p_res.status_code, 200)
        self.assertGreater(p_res.json()["summary"]["purchase_count"], 0)

        # Test Excel export downloads
        s_excel = requests.get(f"{BASE_URL}/registers/sales/export-excel")
        self.assertEqual(s_excel.status_code, 200)
        self.assertGreater(len(s_excel.content), 1000)

        p_excel = requests.get(f"{BASE_URL}/registers/purchases/export-excel")
        self.assertEqual(p_excel.status_code, 200)
        self.assertGreater(len(p_excel.content), 1000)

    def test_19_20_21_fifo_cogs_gross_profit_net_profit(self):
        # Add an operating expense
        cat_id = requests.get(f"{BASE_URL}/expenses/categories").json()[0]["id"]
        exp_res = requests.post(f"{BASE_URL}/expenses", json={
            "category_id": cat_id,
            "amount": 500.0,
            "expense_date": date.today().strftime("%Y-%m-%d"),
            "description": "Packaging & tape supplies"
        })
        self.assertEqual(exp_res.status_code, 200)

        pnl_res = requests.get(f"{BASE_URL}/profit-loss")
        self.assertEqual(pnl_res.status_code, 200)
        pnl = pnl_res.json()

        # Math checks
        net_sales = pnl["net_sales"]
        cogs = pnl["cogs"]
        gross_profit = pnl["gross_profit"]
        operating_profit = pnl["operating_profit"]
        net_profit = pnl["net_profit"]

        self.assertAlmostEqual(gross_profit, net_sales - cogs, places=2)
        self.assertAlmostEqual(operating_profit, gross_profit - pnl["total_operating_expenses"], places=2)
        self.assertGreaterEqual(pnl["current_inventory_value"], 0)

    def test_22_expense_report(self):
        exp_res = requests.get(f"{BASE_URL}/expenses")
        self.assertEqual(exp_res.status_code, 200)
        self.assertGreater(exp_res.json()["total_amount"], 0)

    def test_23_backup_and_restore(self):
        # Create hot backup
        b_res = requests.post(f"{BASE_URL}/backup")
        self.assertEqual(b_res.status_code, 200)
        backup_file = b_res.json()["filename"]

        # List backups
        list_res = requests.get(f"{BASE_URL}/backup")
        self.assertEqual(list_res.status_code, 200)
        files = [f["filename"] for f in list_res.json()]
        self.assertIn(backup_file, files)

        # Restore
        r_res = requests.post(f"{BASE_URL}/backup/restore", json={"filename": backup_file})
        self.assertEqual(r_res.status_code, 200)

    def test_24_expired_and_near_expiry_batches(self):
        alerts = requests.get(f"{BASE_URL}/batches/expiry-alerts").json()
        summary = alerts["summary"]
        self.assertIn("within_30_count", summary)
        self.assertIn("within_60_count", summary)
        self.assertIn("within_90_count", summary)
        self.assertIn("expired_count", summary)

if __name__ == "__main__":
    unittest.main()
