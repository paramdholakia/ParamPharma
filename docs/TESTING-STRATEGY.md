# Testing Strategy & Quality Assurance Architecture
**Document Version:** 1.0.0  
**Date:** November 12, 2026  
**Status:** Active Quality Control Strategy

---

## 1. Testing Philosophy

In an Indian pharmaceutical wholesale management system, **financial, statutory, and inventory correctness takes precedence over visual appearance**. A billing mistake can result in Drug Inspector audit notices, GST tax mismatch penalties, or inventory corruption.

Our testing strategy follows a 3-tier testing pyramid tailored for a single-user Windows desktop / web ERP:

```
          [ E2E / Browser Verification ]
             (Playwright: 6 viewports,
             DOM count, console errors)
        ───────────────────────────────────────
           [ Integration / API Test Suite ]
             (Python unittest + requests:
             24 statutory workflows, FIFO P&L)
      ───────────────────────────────────────────
         [ Domain & Statutory Unit Tests ]
             (Decimal-safe GST rounding,
             Intra/Interstate splits, non-GST)
```

---

## 2. Test Suites & Execution

### 2.1 Statutory & Domain Unit Tests (`tests/test_statutory_gst.py`)
- **Execution**: `.\venv\Scripts\python.exe tests/test_statutory_gst.py`
- **Scope**:
  - `ROUND_HALF_UP` Decimal-safe financial arithmetic to 2 decimal places.
  - Strict 50/50 split for intra-state GST (e.g., 12% GST = 6% CGST + 6% SGST, IGST = 0.0).
  - Inter-state GST rules (12% GST = 12% IGST, CGST = 0.0, SGST = 0.0).
  - Non-GST "Bill of Supply" isolation (0% tax liability across all tax heads).
  - Company settings and local jurisdiction verification (`Bhuj, Kutch (Gujarat) - 370001`).

### 2.2 End-to-End Business Integration Suite (`tests/test_full_suite.py`)
- **Execution**: `.\venv\Scripts\python.exe tests/test_full_suite.py`
- **Scope (24 Scenarios)**:
  - Customer & Supplier Master management with drug license compliance.
  - Product catalog addition (PTR, PTS, MRP, HSN, packing).
  - Purchase Inward (GRN) with automatic multi-batch stock creation and scheme free units.
  - Sales Invoicing with automatic batch stock deduction (billed + free units) and FEFO dispatch.
  - ReportLab statutory A4 GST invoice PDF generation.
  - Partial payments, customer receipts, and supplier payment vouchers with ledger running balance updates.
  - Inspection-gated sales returns (Credit Notes) and supplier debit notes.
  - FIFO-costed Cost of Goods Sold (COGS), gross margins, and operating expenses.

### 2.3 Automated Playwright Browser E2E Suite (`frontend/tests/baseline_e2e.mjs`)
- **Execution**: `cd frontend; node tests/baseline_e2e.mjs`
- **Scope**:
  - Real headless Chromium browser execution against `http://127.0.0.1:5173`.
  - Multi-viewport layout stability testing:
    1. Desktop 1080p (`1920 × 1080`)
    2. Laptop HD (`1366 × 768`) — Primary target
    3. Desktop 720p (`1280 × 720`)
    4. Legacy 4:3 (`1024 × 768`) — Windows 7 legacy display
    5. Tablet Portrait (`768 × 1024`)
    6. Mobile Portrait (`390 × 844`)
  - Console error monitoring: captures JavaScript runtime exceptions, failed fetches, and uncaught promises.
  - DOM tree depth and node count monitoring (< 800 nodes target).

---

## 3. Regression Prevention Rules

1. **No Frontend Financial Calculations as Source of Truth**:
   The backend FastAPI server remains the authoritative calculator for taxable value, discounts, GST amounts, and running balances.
2. **Zero Pre-existing Failure Tolerance**:
   No UI change or refactoring is committed if any integration test or Playwright test fails.
3. **Continuous Build Verification**:
   Before every commit, `cd frontend; npm run build` must succeed with zero TypeScript errors.
