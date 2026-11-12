# Zero-Cost Secure Remote Deployment Plan
**Document Version:** 1.0.0  
**Date:** November 12, 2026  
**Infrastructure Budget:** Strictly ₹0 / month (Zero Paid Infrastructure)  
**Status:** Planning & Architectural Analysis (Deployment Pending User Decision)

---

## 1. Zero-Cost Architectural Options

Per client instruction, backend and deployment decisions are kept pending to allow flexible adjustment later without breaking the application. We present the two best zero-cost architectures:

### Option A — Hybrid Cloud: Vercel (Frontend) + Render Free (Backend) + MongoDB Atlas M0 (Database)

```
[ User PC / Mobile Client ]
            │ HTTPS
            ▼
┌───────────────────────────────────────┐
│         Vercel Hobby Tier             │
│    React 19 SPA (Free HTTPS CDN)      │
└───────────────────┬───────────────────┘
                    │ HTTPS API Requests
                    ▼
┌───────────────────────────────────────┐
│           Render Free Tier            │
│       FastAPI Python Web Service      │
└───────────────────┬───────────────────┘
                    │ TLS Connection
                    ▼
┌───────────────────────────────────────┐
│         MongoDB Atlas M0 Free         │
│  AWS Mumbai (512 MB Storage, Auto TLS)│
└───────────────────────────────────────┘
```

#### Render Free Limitations to Account For:
- **Spin-down on Inactivity**: Free instances spin down after 15 minutes of inactivity. Initial "cold start" request takes 30–50 seconds to boot.
- **Ephemeral Filesystem**: Any local SQLite file written to Render's disk is wiped on restart! Render **must** use MongoDB Atlas as its authoritative database.

---

### Option B — Zero Trust Local Server: Cloudflare Zero Trust Tunnel (Recommended Alternative)

```
[ User Smartphone / Remote Laptop ]
            │ Secure Authenticated HTTPS
            ▼
┌───────────────────────────────────────┐
│     Cloudflare Zero Trust Edge        │
│   (Free Tier: 50 Users, Zero Cost)    │
└───────────────────┬───────────────────┘
                    │ Encrypted Outbound Tunnel
                    ▼
┌───────────────────────────────────────┐
│       Local Windows Desktop PC        │
│   FastAPI + SQLite WAL Mode (Local)   │
│   + MongoDB Atlas Background Backup   │
└───────────────────────────────────────┘
```

#### Why Option B is Highly Attractive for This Project:
1. **Zero Cold Starts**: The local PC is already on during business hours; response times are < 10 ms.
2. **True Offline-First Resilience**: If the internet goes down, the local shop can continue billing without interruption on local SQLite.
3. **No Database Migration Needed**: Uses the existing, tested SQLite WAL database and syncs to MongoDB Atlas for offsite backup.
4. **Strict ₹0/month**: Cloudflare Zero Trust Free tier covers up to 50 users with multi-factor authentication and zero open ports on the home router.

---

## 2. Zero-Cost Backup & Recovery Strategy

1. **Automated SQLite Hot Backups**:
   - `backend/app/routers/backup.py` leverages `sqlite3.Connection.backup()` to create consistent point-in-time snapshots without locking read/write billing operations.
2. **Cloud Replication to MongoDB Atlas M0**:
   - Every invoice, product, customer, and payment record is mirrored to `ParamPharmaCluster` on AWS Mumbai.
   - Provides offsite disaster recovery at zero cost.
3. **Automated Weekly Encrypted Export**:
   - Python script exports SQLite snapshot + JSON dump, encrypts with AES-256 (`cryptography` library), and saves to local external USB drive or Google Drive (15 GB free tier).
4. **Recovery Procedure**:
   - In the event of hard drive failure, run `init_database()` and trigger `/api/cloud/sync` in reverse, restoring all collections from MongoDB Atlas into a fresh SQLite file in < 10 seconds.

---

## 3. Pre-Deployment Verification Checklist

- [ ] All 19 integration tests and statutory GST tests passing.
- [ ] TypeScript production build succeeds with 0 errors.
- [ ] CORS origins locked to frontend domain only.
- [ ] `SECRET_KEY` and database credentials supplied via environment variables.
- [ ] Client decision on Option A (Render Cloud) vs. Option B (Cloudflare Tunnel).
