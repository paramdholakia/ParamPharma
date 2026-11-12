# Param Pharma — Mobile Android Companion Application

High-performance mobile application for **Param Pharma** field operations (van deliveries, field collections, customer ledger inspection, and medicine stock lookup) built with **React Native Expo (SDK 58)**, **TypeScript**, and the **Hermes JavaScript Engine**.

---

## 1. System Architecture

```
┌───────────────────────────────────────────────┐
│           Param Pharma Android App            │
│       (React Native Expo + TypeScript)        │
│       Hermes Bytecode Engine (.hbc)           │
└───────────────────────┬───────────────────────┘
                        │ HTTP / JSON REST
                        │ Direct LAN / Cloud API
                        ▼
┌───────────────────────────────────────────────┐
│            FastAPI Backend Server             │
│        Authoritative GST & Stock Engine       │
│        (Listening on 0.0.0.0:8000)            │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│        MongoDB Atlas M0 / SQLite WAL          │
│            Persistent Data Store              │
└───────────────────────────────────────────────┘
```

---

## 2. Core Capabilities

### 🚚 1. Field Sales & Van Invoicing (`BillingScreen`)
- **Retail Chemist Selection**: Search and select chemist with live credit balance and delivery address.
- **Medicine & Batch Picker**: Search brands/generics, select batch with FEFO expiry and stock visibility.
- **Scheme Free Units & Discounts**: Calculates billed quantity, free quantity (e.g. 10+1), and trade discounts.
- **Statutory GST Engine**: Auto-determines CGST/SGST (intra-state) or IGST (inter-state), taxable value, and round-off.
- **Dynamic UPI Payment**: Generates Android deep-link intent to Google Pay / PhonePe / Paytm with active VPA (`aldholakia72@okicici`) and exact amount.
- **WhatsApp Bill Sharing**: 1-click WhatsApp sharing with retail chemist.

### 💰 2. Field Collections & Money Receipts (`CollectionsScreen`)
- **Live Outstanding Display**: Shows retail chemist's outstanding balance before entering collection.
- **Multi-Mode Support**: Cash, UPI, Cheque, and Bank Transfer with UTR and bank details.
- **Double-Entry Posting**: Immediately posts credit to customer ledger on the authoritative server.
- **Official Receipt Ref**: Generates sequence voucher (e.g., `RCP26/2026-2027/1`).
- **1-Click WhatsApp Receipt**: Formats and sends official money receipt confirmation on WhatsApp.

### 👥 3. Chemists Directory & Ledger Statements (`CustomersScreen`)
- Search by pharmacy name, city, phone, DL number, or GSTIN.
- Direct phone call trigger (`tel:`) and direct WhatsApp message.
- Itemized transactional ledger viewer showing running balance, debit (bills), and credit (payments).

### 📦 4. Medicine Stock & Batch Catalog (`StockScreen`)
- Search by brand name, generic formulation, or pharmaceutical manufacturer.
- Filter by All Products, Low Stock Alerts, and Expiring Soon.
- Displays active batches, expiry dates with status badges (Safe / Expires Soon / Expired), and PTR / MRP / PTS pricing.

### ⚙️ 5. Server Connection & Settings (`SettingsScreen`)
- Switch between **LAN Wi-Fi (`192.168.1.4:8000/api`)**, **Android Emulator (`10.0.2.2:8000/api`)**, and **Custom Remote URL**.
- Live server ping test with connection indicator and latency check.
- Company details, drug licenses, GSTIN, and active UPI ID verification.

---

## 3. Quick Start & Running the App

### Option A: Test on Physical Android Phone via Expo Go (Fastest)
1. Ensure your Android phone and host PC are connected to the **same Wi-Fi network**.
2. Install **Expo Go** from Google Play Store on your phone.
3. In the project root, start Expo:
   ```bash
   cd mobile
   npx expo start
   ```
4. Scan the QR code displayed in the terminal using the Expo Go app.
5. The mobile app will open on your phone and automatically connect to `http://192.168.1.4:8000/api`.

### Option B: Run on Android Emulator
```bash
cd mobile
npm run android
```
The app will connect to `http://10.0.2.2:8000/api`.

### Option C: Build Standalone Production Bundle
To compile the Hermes optimized production bytecode bundle:
```bash
cd mobile
npx expo export --platform android
```
Compiled output is generated in `mobile/dist/` (`index.hbc`).
