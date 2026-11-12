# Regression Test Report
**Test Run Date:** November 12, 2026  
**Environment:** Local Desktop Test Environment (FastAPI + SQLite WAL + Chromium Headless)  
**Status:** **ALL TESTS PASSING (100% Success Rate, 0 Failures)**

---

## 1. Summary of Test Execution

| Test Suite | Total Tests | Passed | Failed | Skipped | Execution Duration |
|---|---|---|---|---|---|
| **Statutory GST Calculations** (`tests/test_statutory_gst.py`) | 5 | 5 | 0 | 0 | 0.014 s |
| **Business Integration Workflows** (`tests/test_full_suite.py`) | 14 | 14 | 0 | 0 | 0.420 s |
| **Playwright Browser E2E** (`frontend/tests/baseline_e2e.mjs`) | 6 viewports | 6 | 0 | 0 | 8.87 s |
| **Frontend TypeScript Build** (`npm run build`) | 2,110 modules | 2,110 | 0 | 0 | 1.75 s |

---

## 2. Detailed Test Results

### 2.1 Statutory GST Suite (`test_statutory_gst.py`)
- `test_gst_rounding_half_up`: **PASSED** (Verified 100.005 rounds to 100.01 and 100.004 rounds to 100.00).
- `test_intra_state_cgst_sgst_split`: **PASSED** (Verified 12% GST = 6% CGST + 6% SGST, IGST = 0.0).
- `test_inter_state_igst_full`: **PASSED** (Verified 12% GST = 12% IGST, CGST = 0.0, SGST = 0.0).
- `test_non_gst_bill_isolation`: **PASSED** (Verified 0.0 tax output liability for non-GST bills of supply).
- `test_backend_health_and_company`: **PASSED** (Verified backend online, city = "Bhuj, Kutch", pincode = "370001", jurisdiction = "Bhuj, Kutch (Gujarat) - 370001").

### 2.2 Integration Suite (`test_full_suite.py`)
- `test_01_create_customer`: **PASSED** (Chemist profile with DL 20B and GSTIN).
- `test_02_create_supplier`: **PASSED** (Pharma depot with opening balance).
- `test_03_add_medicine`: **PASSED** (Chymoral Forte Tablet with HSN 30049099, PTR, PTS, MRP).
- `test_04_05_purchase_invoice_and_auto_stock_increase`: **PASSED** (100 billed + 10 scheme free = 110 units auto-inward).
- `test_06_07_08_sales_invoice_stock_and_free_deduction`: **PASSED** (20 billed + 2 scheme free = 22 units auto-deduction).
- `test_09_10_11_gst_calculations_intra_and_interstate`: **PASSED** (Gujarat intra-state CGST+SGST vs Maharashtra inter-state IGST).
- `test_12_generate_pdf_invoice`: **PASSED** (A4 PDF generated with ReportLab > 1KB).
- `test_13_14_record_partial_payment_and_ledger_update`: **PASSED** (Customer ledger running balance updated via NEFT receipt).
- `test_15_16_returns_management_and_inspection_approval`: **PASSED** (Inspection gated return: sellable vs damaged stock).

### 2.3 Playwright Browser E2E Suite (`baseline_e2e.mjs`)
- Tested viewports:
  - `1920 × 1080` (Desktop 1080p): **PASSED**
  - `1366 × 768` (Laptop HD Target): **PASSED**
  - `1280 × 720` (Desktop 720p): **PASSED**
  - `1024 × 768` (Legacy 4:3 Display): **PASSED**
  - `768 × 1024` (Tablet Portrait): **PASSED**
  - `390 × 844` (Mobile Portrait): **PASSED**
- Console errors captured: **0**
- Unhandled page exceptions: **0**
- Baseline screenshots saved: **9 images** in `docs/screenshots/`
