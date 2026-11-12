# Param Pharma — Complete Pharmaceutical Wholesale ERP, GST Billing & Accounting Software

A high-performance, offline-first Pharmaceutical Wholesale and Distribution Management System built for Indian pharma distributors and wholesale chemists. 

Engineered with a **Windows-first desktop architecture**, **React 19 + TypeScript frontend**, **Tailwind CSS Minimalist Brutalist Design**, **Python FastAPI backend**, **SQLite WAL mode (local offline)**, and **MongoDB Atlas Cloud Replication (`ParamPharmaCluster`)**.

---

## 🌟 Key Highlights & Capabilities

### 1. ⚡ Pharmaceutical Sales Billing (GST Invoicing)
- **Keyboard-Driven POS**: Fast search by brand name, generic formulation, or batch number. Shortcut `[F2]` anywhere for instant billing.
- **Dynamic UPI Payment QR Code**: Generates on-screen & printable dynamic Bharat UPI QR codes (`aldholakia72-1@okaxis` / `9429041051`) with invoice-exact payable amounts for instant customer payments via GPay, PhonePe, Paytm, or BHIM.
- **WhatsApp Direct Invoicing**: One-click dispatch of invoice summaries, total amounts, and payment links directly to the customer's WhatsApp mobile number.
- **Flexible Pricing & Schemes**: Supports Free Quantity Schemes (e.g. 10 + 1 Free), item-wise cash discounts, and editable GST rates (0%, 5%, 12%, 18%, 28%).
- **Intra-State & Inter-State GST Engine**: Automatic calculation of CGST + SGST (intra-state) or IGST (inter-state) based on customer state codes.
- **Drug License Compliance**: Prints DL 20B and DL 21B, GSTIN, PAN, HSN codes, and mandatory Drug & Cosmetics Act declarations on every invoice.

### 2. 📦 Pharmaceutical Purchase Billing & GRN
- Inward consignment entry with invoice numbers, purchase rates, trade discounts, and landed costs.
- Automatically creates new batches with manufacturing and expiry dates in the inventory ledger.

### 3. 🏷️ Batch-Wise Inventory & Expiry Management
- Batch-level tracking: Each medicine maintains independent batches with distinct purchase rates, MRP, PTR, PTS, and expiry dates.
- **Color-Coded Expiry System**:
  - 🔴 **Expired Stock**: Blocked from sales billing to ensure compliance.
  - 🟡 **Near Expiry (Within 90 Days)**: Proactively surfaced on dashboard and top alert pills.
  - 🟢 **Active Stock**: Prioritized using First-Expiry-First-Out (FEFO) dispensing.
- Stock Adjustments: Breakage, damaged goods, transit losses, and audit reconciliations.

### 4. 🔄 Sales Returns (Credit Notes) & Purchase Returns (Debit Notes)
- Issue Credit Notes (CN) to customers for returned goods; returns restock inventory automatically.
- Issue Debit Notes (DN) to suppliers/manufacturers for expired or damaged items; reduces accounts payable.

### 5. 👥 Customer & Supplier Master Ledgers
- Complete customer profiles for Doctors, Chemists, Retail Pharmacies, Hospitals, and Wholesalers.
- Opening balances, payment terms (7, 15, 21, 30 days), and credit limits with visual overdue alerts.
- Detailed running account statements with running debit, credit, and net balance history.

### 6. 💳 Payment Management & Vouchers
- **Customer Receipts (Collections)**: Cash, NEFT/RTGS Bank Transfers, Cheques, and UPI collections credited directly to customer ledger.
- **Supplier Payment Vouchers (Disbursements)**: Track bank payments, UTR reference numbers, and running payables.

### 7. 💼 Operating Expense Register
- Track business overheads across 18 standard pharma expense categories (Staff Salaries, Office Rent, Electricity, Transportation, Packaging, Loading/Unloading, Generator Fuel, Software, etc.).

### 8. 📊 FIFO-Costed Profit & Loss Statement
- Accurate Wholesale Margin Calculation: Net Taxable Sales - FIFO COGS - Operating Overheads.
- Clean distinction between sales revenue and statutory tax collections (Output Tax & Input Tax Credit).
- Product-wise profit margins identifying top revenue and margin drivers.

### 9. 📑 Indian GST Reports & ITC Reconciliation
- GSTR-1 Outward Supplies vs. GSTR-3B Input Tax Credit (ITC) reconciliation.
- Instant calculation of Net Tax Liability or Excess ITC carry-forward.

### 10. ☁️ MongoDB Atlas Cloud Synchronization (`ParamPharmaCluster`)
- **Offline-First Resilience**: Local billing and inventory operations execute with zero latency on SQLite WAL mode.
- **Cloud Replication**: Automatic/manual mirroring to MongoDB Atlas (`ParamPharmaCluster` on AWS Mumbai `ap-south-1`) for remote multi-machine access and offsite backup.
- Header status pill indicates real-time cloud connection health and latency.

### 11. 🎨 Minimalist Brutalist Design & Dark Mode
- High-contrast, typography-focused professional interface with sharp borders and clean monospace numerals.
- Complete system-wide Dark Mode toggle (`Light` / `Dark`) supported across all 11 ERP modules.
- Built-in Interactive **Software Tutorial & Workflow Guide** accessible on demand from the top header.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + TypeScript |
| **Styling & Theme** | Tailwind CSS v4 (Minimalist Brutalist with High-Contrast Dark Mode) |
| **Icons** | Lucide React |
| **Bundler / Dev Server** | Vite 8 |
| **Backend Framework** | Python 3.12+ / FastAPI |
| **Local Database** | SQLite (WAL Mode, fast indexing, transaction-safe) |
| **Database ORM** | SQLAlchemy 2.0 |
| **Cloud Database** | MongoDB Atlas (`ParamPharmaCluster`, AWS `ap-south-1`) |
| **Driver / Sync** | PyMongo with dnspython SRV resolution |
| **PDF Generation** | ReportLab |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher & npm
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/paramdholakia/ParamPharma.git
cd ParamPharma
```

### 2. Setup Backend
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r backend/requirements.txt
```

### 3. Setup Frontend
```bash
cd frontend
npm install
cd ..
```

### 4. Run the Application
You can start both backend and frontend with one command:
```bash
# Double-click or run:
run_param_pharma.bat
```
Or start each service independently:
```bash
# Terminal 1 - Backend:
.\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 - Frontend:
cd frontend
npm run dev
```

Open your browser at **`http://localhost:5173`**. The backend API documentation is available at **`http://127.0.0.1:8000/docs`**.

---

## 🔒 Default Credentials & Initial Setup
- **Admin Username**: `admin`
- **Admin Password**: `admin123`
- **Company Trading Name**: `PARAM PHARMA`
- **Official Mobile**: `9429041051`
- **Primary UPI ID**: `aldholakia72-1@okaxis`
- **Financial Year**: `2026-2027`

---

## 🧪 Running the Test Suite
The ERP includes automated end-to-end unit and integration tests covering products, batch inventory, intra/inter-state GST math, ledgers, and PDF invoice generation:
```bash
.\venv\Scripts\python.exe tests/test_full_suite.py
```

---

## 📄 License
Proprietary software developed for Param Pharma Wholesale & Distribution. All rights reserved.
