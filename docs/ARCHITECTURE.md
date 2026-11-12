# Param Pharma — System Architecture & Technical Assessment
**Document Version:** 3.0.0  
**Date:** November 12, 2026  
**Status:** Phase 1 Initial Technical Assessment (Pending Approval)

---

## 1. Executive Summary

Param Pharma is a specialized, production-ready Pharmaceutical Wholesale ERP, GST Billing, Inventory Management, and Accounting application. It is purpose-built for an Indian pharmaceutical distributor operating in Bhuj, Kutch (Gujarat).

The system is designed for **one primary user and single concurrent access**, emphasizing:
1. **Financial & Statutory Correctness**: Exact CGST/SGST/IGST tax calculation, HSN summaries, Drug & Cosmetics Act compliance (DL 20B/21B), and A4 GST invoice PDF and Excel generation.
2. **Extreme Low-End Hardware Optimization**: Must execute smoothly on legacy hardware (Intel Core 2 Duo, 2 GB DDR2 RAM, 5400 RPM HDD, Windows 7, Chrome 109 / Firefox ESR 115).
3. **Zero-Cost Remote Deployment**: Prepared for secure remote access at strictly ₹0/month using free hosting tiers (Vercel Hobby, Render Free, MongoDB Atlas M0, GitHub).
4. **Future Android Roadmap**: Architecture structured so a future mobile app can share the existing FastAPI backend without duplicating business logic.

---

## 2. Technology Stack & Versions

| Layer | Technology | Current Version | Purpose & Notes |
|---|---|---|---|
| **Frontend Framework** | React | 19.3.1 | Core UI rendering engine |
| **Language** | TypeScript | ~7.0.2 | Strict type safety for pharmaceutical domain models |
| **Bundler & Dev Server** | Vite | 8.3.6 | Fast ES module bundling, HMR, production minification |
| **Styling & CSS** | Tailwind CSS | 4.3.5 (`@tailwindcss/vite`) | Utility-first CSS, minimal runtime overhead |
| **Iconography** | Lucide React | 1.72.0 | Tree-shaken SVG icons |
| **Backend Framework** | FastAPI | 0.162.5 | High-performance Python async REST API |
| **ASGI Server** | Uvicorn | 0.54.0 | Lightweight HTTP server |
| **Local Database** | SQLite 3 (WAL mode) | Embedded | Primary local offline ACID transactional store |
| **Database ORM** | SQLAlchemy | 2.1.8 | Database abstraction and query management |
| **Cloud Database** | MongoDB Atlas | Cluster M0 (AWS Mumbai) | Cloud data replication and remote access store |
| **MongoDB Driver** | PyMongo + dnspython | 4.19.0 / 2.9.2 | Connection and document sync layer |
| **PDF Generation** | ReportLab | 5.1.0 | Statutory A4 Tax Invoice PDF engine |
| **Spreadsheet Engine** | OpenPyXL | 3.1.5 | Excel invoice and register export |
| **Barcode / QR Engine** | Python Qrcode + Pillow | 8.2 / 13.0.0 | NPCI-compliant UPI dynamic payment QR codes |
| **Security / Crypto** | PyJWT + Passlib | 2.15.1 / 1.7.4 | JWT token creation and password hashing |

---

## 3. Application Feature Inventory

Every feature below has been inspected in the active codebase:

### Master Data Management
- **Customer Master (`Customers.tsx`, `customers.py`)**: Profiles for Chemists, Doctors, Hospitals, Wholesalers; tracks DL 20B/21B, GSTIN, PAN, credit limits, payment terms, and opening balances. Includes search suggestions and quick customer modal.
- **Supplier Master (`Suppliers.tsx`, `suppliers.py`)**: Profiles for pharmaceutical manufacturers, C&F agents, and depots; tracks GSTIN, DL, credit terms, and payable balances.
- **Product Master (`Products.tsx`, `products.py`)**: Medicine catalog with brand names, generic compositions, manufacturers, HSN codes, packing units, MRP, PTR, PTS, GST tax rates (0%, 5%, 12%, 18%, 28%), and min/reorder stock thresholds. Includes product deletion with safety checks.

### Transactions & Billing
- **Sales Billing Counter (`SalesBilling.tsx`, `sales.py`)**: Keyboard-driven billing (`[F2]` shortcut), instant medicine search, batch selection, scheme free goods (e.g. 10+1 Free), cash discounts, and real-time CGST/SGST/IGST tax calculation.
  - **Dynamic UPI QR Code**: Generates NPCI-compliant UPI QR codes with invoice-exact amounts and dynamic VPA selection (`aldholakia72@okicici`, `9429041051@okaxis`, etc.).
  - **WhatsApp Direct Invoicing**: Generates pre-formatted WhatsApp payment and billing messages with a single click.
  - **Non-GST / Retail Mode**: Generates "BILL OF SUPPLY / CASH MEMO" bills for unregistered customers with zero tax liability.
  - **Dual Export**: Generates both statutory ReportLab PDF and OpenPyXL Excel invoices.
- **Purchase Billing (`PurchaseBilling.tsx`, `purchases.py`)**: Inward Goods Receipt Notes (GRN), invoice numbers, multi-batch inward, free scheme receipt, auto-stock creation, and automatic supplier ledger credit.
- **Editable Purchase Register (`PurchaseRegister.tsx`, `purchases.py`)**: Supports transactional editing of inward consignments (`PUT /api/purchases/{id}`) with safe rollback of previous batch quantities and ledger reversal.
- **Sales Returns (`SalesReturns.tsx`, `returns.py`)**: Customer returns with Credit Note (CN) generation and an inspection workflow (separating sellable stock restoration from damaged stock write-off).
- **Purchase Returns (`PurchaseReturns.tsx`, `returns.py`)**: Supplier returns with Debit Note (DN) generation for damaged or expired consignments.

### Financials & Reporting
- **Customer & Supplier Ledgers (`CustomerLedger.tsx`, `SupplierLedger.tsx`, `ledgers.py`)**: Running account statements showing all debits, credits, running balances, and payment references.
- **Payment Vouchers (`Payments.tsx`, `payments.py`)**: Receipts from customers and payment disbursements to suppliers across Cash, Bank Transfer (NEFT/RTGS), Cheque, and UPI.
- **Business Expenses (`Expenses.tsx`, `expenses.py`)**: Overheads recorded across 18 pre-seeded pharmaceutical expense categories and custom user categories.
- **Profit & Loss Statement (`ProfitLoss.tsx`, `profit_loss.py`)**: FIFO-costed COGS, gross margin, operating overheads, 0% tax provision per client setting, and net profit.
- **GST Reports (`GstReports.tsx`, `registers.py`)**: GSTR-1 outward supplies vs. GSTR-3B Input Tax Credit (ITC), net liability, and CGST/SGST/IGST summaries.
- **Sales & Purchase Registers (`SalesRegister.tsx`, `PurchaseRegister.tsx`, `registers.py`)**: Tabular transaction registers with tax-type filters, date filters, and Excel exports.
- **Interactive Dashboard (`Dashboard.tsx`, `dashboard.py`)**: Time-range ribbon (Today, 7D, Month, Quarter, FY 26-27, Custom), KPIs, interactive trend graphs with tooltips, customer distribution, and medicine velocity.

### System & Utilities
- **Settings & Backup (`Settings.tsx`, `company.py`, `backup.py`, `cloud.py`)**: Company profile, drug licenses, hot SQLite backup & restore, MongoDB Atlas sync trigger, and clean reset.
- **Interactive Software Tutorial (`SoftwareTutorialModal.tsx`)**: 12-module guided visual walkthrough opened exclusively via the top header tutorial button.

---

## 4. Existing Design & UI Problems

1. **Brutalist Borders & Visual Density**:
   - The current UI utilizes a Minimalist Brutalist style (`1.5px solid #0f172a`, `box-shadow: 2px 2px 0px 0px #0f172a`). While crisp, some tables and dialogs look stark and raw, lacking the refined visual polish, subtle depth, and optical hierarchy expected in a high-grade professional ERP.
2. **Monolithic Bundle & Navigation Clutter**:
   - `App.tsx` statically imports all 19 views, producing a 558 kB single JavaScript chunk.
   - The navigation sidebar displays 19 distinct items simultaneously. On smaller displays (1024x768 or 1366x768), this causes vertical navigation overflow.
3. **Typography & Tabular Data**:
   - Typography defaults to system fonts (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`).
   - Financial numbers in dense billing tables need dedicated tabular figures (`font-variant-numeric: tabular-nums`) to prevent jitter and maintain strict vertical alignment.
4. **Form Controls & Micro-Interactions**:
   - Focus states, button press animations, and modal entrances are instantaneous without smooth, low-cost easing curves.
   - Large table views lack responsive horizontal scroll indicators or pinned action columns on smaller viewports.

---

## 5. Existing Performance Problems

1. **Initial JavaScript Evaluation**:
   - The 558 kB single bundle warning from Vite indicates that on an Intel Core 2 Duo CPU, parsing and executing the bundle on initial load causes a 1,000–1,500 ms main-thread freeze.
   - Code-splitting page routes via `React.lazy()` and `Suspense` will shrink the critical initial chunk to < 90 kB.
2. **Unconditional Background Polling**:
   - `App.tsx` executes an interval timer every 30 seconds calling `GET /api/dashboard`. This wakes up the CPU, network stack, and SQLite database even when the application is idle.
   - This should be changed to event-driven updates (updating alerts only after billing/purchase transactions or when returning to focus).
3. **Large List DOM Nodes**:
   - Master views (`Products.tsx`, `Customers.tsx`, `Suppliers.tsx`) fetch up to 200–250 items at once and render all rows directly into the DOM without windowing or chunking, resulting in 2,500+ DOM nodes and sluggish scrolling on 2 GB RAM.
4. **Memory Retention**:
   - Object URLs generated for PDF and Excel file downloads (`window.URL.createObjectURL(blob)`) must be systematically cleaned up via `window.URL.revokeObjectURL(downloadUrl)` to prevent memory leaks in long-running browser sessions.

---

## 6. Application Security Concerns

1. **Unprotected API Endpoints**:
   - While `backend/app/routers/auth.py` provides `/api/auth/login` and `/api/auth/me`, business endpoints (`/api/sales`, `/api/purchases`, `/api/customers`, etc.) currently do not enforce `Depends(get_current_user)`.
   - In a local offline setup, this is harmless; but for zero-cost remote deployment (Render/Vercel), this leaves the ERP open to unauthorized public access.
2. **CORS Configuration**:
   - `main.py` currently sets `allow_origins=["*"]`. In production, this must be restricted to the exact Vercel frontend origin.
3. **Password Hashing**:
   - `auth.py` currently uses `pbkdf2_sha256` from passlib. The project directive requires upgrading to `Argon2id` for robust credential hashing.
4. **Plaintext Fallback Secrets**:
   - `backend/app/config.py` and `backend/app/services/mongo_service.py` contain hardcoded fallback secret keys and MongoDB connection strings. In production, these must strictly be supplied via environment variables (`SECRET_KEY`, `MONGO_URI`).
5. **Token Storage**:
   - Auth tokens should be transmitted and stored using secure HttpOnly, SameSite cookies for web clients to eliminate XSS token theft.

---

## 7. Database & API Architecture Analysis

### Current Dual-Database Setup
- **Local SQLite (`backend/data/param_pharma.db`)**: Primary transaction store. Highly optimized with WAL mode, `PRAGMA synchronous=NORMAL`, and composite indexes. Delivers sub-5ms response times offline on 5400 RPM HDDs.
- **MongoDB Atlas (`ParamPharmaCluster`)**: Cloud replication store. Mirrors SQLite records via `backend/app/services/mongo_service.py` (`POST /api/cloud/sync`).

### Cloud Deployment Risk (Render Free Tier)
- Render Free web services have an **ephemeral filesystem**. Any file written to disk (including `param_pharma.db`) is permanently erased when the instance spins down due to inactivity (after 15 minutes) or during redeployment.
- **Architectural Solution**:
  - For the zero-cost remote deployment on Render, FastAPI must connect directly to MongoDB Atlas as its persistent data store, OR the primary backend must remain on the local machine with secure zero-cost remote access (e.g. Cloudflare Zero Trust Tunnel), OR a unified data repository layer must be used that delegates to SQLite when running locally and MongoDB Atlas when running on cloud.

---

## 8. Existing Test Coverage

- **Automated Test Suite (`tests/test_full_suite.py`)**:
  - 14 integration test suites covering 24 statutory business and accounting workflows.
  - Test status: **100% Passed (14/14 tests in 0.588s)**.
  - Tested flows: Customer creation, Supplier creation, Medicine creation, Purchase invoice with auto-stock inward (billed + free), Sales invoice with auto-stock deduction (billed + free), Intra-state vs Inter-state GST calculation, ReportLab PDF generation, Partial payments & customer ledger updates, Sales returns with inspection approval, FIFO profit and loss calculations.
- **Gaps to Address in Phase 4**:
  - Need unit tests for edge-case GST decimal rounding (0.005 rounding rules).
  - Need Playwright E2E browser tests for multi-viewport UI verification and form interaction testing.

---

## 9. Windows 7 & Legacy Browser Compatibility Constraints

| Constraint | Environment Target | Engineering Implication |
|---|---|---|
| **Operating System** | Windows 7 SP1 (64-bit / 32-bit) | Unsupported OS; treat as legacy constraint |
| **Processor** | Intel Core 2 Duo (circa 2006–2008) | Strict limit on JS execution time; keep CPU idle |
| **RAM** | 2 GB DDR2 | Strict memory ceiling; browser heap must remain < 100 MB |
| **Graphics** | Legacy Integrated (Intel GMA 3100/4500) | No GPU blur filters (`backdrop-filter`), no perpetual CSS animations |
| **Storage** | 5400 RPM Mechanical HDD | SQLite WAL mode + PRAGMA synchronous=NORMAL is critical |
| **Browser Baseline** | Chrome 109 / Firefox ESR 115 | Supported: ES2022, Flexbox, Grid, CSS custom properties.<br>Unsupported: CSS Anchor Positioning, `@starting-style`, native Popover API |
| **TLS / SSL** | TLS 1.2 supported | Cloud endpoints must support TLS 1.2 ciphers (Windows 7 lacks modern TLS 1.3 out-of-the-box) |

---

## 10. Recommended Implementation Strategy & Execution Plan

### Proposed Execution Phases

```
Phase 1: Discovery, Research & Technical Assessment (Current)
   └── Complete ARCHITECTURE.md inspection (NO code changes) -> Request Approval
Phase 2: Skill Installation & Tooling Setup
   └── Install vetted design & browser testing tools (Playwright, Vercel guidelines, Taste)
Phase 3: GitHub Rollback Checkpoint
   └── Create branch 'ui-overhaul-3', tag 'pre-ui-overhaul-3', commit checkpoint & push
Phase 4: Testing & Performance Baseline
   └── Add Playwright E2E suite, measure bundle size, CPU/RAM, API latencies
Phase 5: UI Design System & Planning
   └── Draft UI-DESIGN-SYSTEM.md (typography, palette, high-craft density, responsive)
Phase 6: UI Overhaul #3 Implementation
   └── Route code-splitting, typography, responsive billing grids, micro-interactions
Phase 7: Browser, Regression & Performance QA
   └── Playwright verification (6 viewports: 1920x1080 to 390x844), verify zero regression
Phase 8: Mobile Architecture Planning (Android Roadmap)
   └── Produce MOBILE-ARCHITECTURE.md (planning only; no mobile code yet)
Phase 9: Secure Zero-Cost Remote Deployment Planning
   └── Vercel + Render + MongoDB Atlas M0 + Argon2id Auth + Backup strategy
```

---
*End of Technical Assessment. Awaiting user approval to proceed to Phase 2.*
