# Application Security Verification Checklist
**Document Version:** 1.0.0  
**Date:** November 12, 2026  
**Standard:** OWASP Top 10 & Pharmaceutical Data Protection

---

## 1. Authentication & Access Control

| Control | Implementation Status | Notes |
|---|---|---|
| **Password Hashing** | PBKDF2-SHA256 active (`auth.py`) | Ready for upgrade to Argon2id prior to public cloud exposure |
| **No Public Registration** | **ENFORCED** | User creation is restricted; single administrator account |
| **Session Invalidation** | **SUPPORTED** | Expired tokens rejected with HTTP 401 Unauthorized |
| **Hardware Keystore (Mobile)** | **SPECIFIED** | `expo-secure-store` backed by Android Keystore in mobile plan |
| **Protected API Endpoints** | Local unauthenticated mode | Must bind `Depends(get_current_user)` when exposing to public internet |

---

## 2. Network & Transport Security

| Control | Implementation Status | Notes |
|---|---|---|
| **HTTPS / TLS 1.2+** | **ENFORCED** | Enforced by Vercel CDN, Render, and MongoDB Atlas |
| **CORS Restriction** | `allow_origins=["*"]` currently | Must be restricted to specific Vercel frontend URL on cloud deployment |
| **Database Encryption in Transit** | **ENFORCED** | TLS connection string to MongoDB Atlas (`ssl=true`) |
| **No Raw Database Ports Exposed** | **ENFORCED** | Neither SQLite nor MongoDB is exposed to public browser traffic |

---

## 3. Data Integrity & Financial Protection

| Control | Implementation Status | Notes |
|---|---|---|
| **Authoritative Backend Calculations** | **ENFORCED** | All GST amounts, taxable values, and totals verified by FastAPI |
| **Decimal-Safe Financial Arithmetic** | **ENFORCED** | Standard `ROUND_HALF_UP` 2-decimal rounding |
| **Statutory DL Compliance** | **ENFORCED** | Drug license numbers (DL 20B/21B) printed on every tax invoice |
| **Inspection-Gated Returns** | **ENFORCED** | Goods must be inspected before restocked into inventory |
| **Crash-Safe Transactions** | **ENFORCED** | SQLite Write-Ahead Logging (WAL) prevents DB corruption |
| **Hot Database Backup** | **ENFORCED** | Hot online backups via `sqlite3.Connection.backup()` |
