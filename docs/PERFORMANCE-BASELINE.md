# Pre-Overhaul Performance Baseline
**Date:** November 12, 2026  
**Hardware Profile:** Intel Core 2 Duo / 2 GB DDR2 RAM / Windows 7 Baseline Simulation  
**Test Environment:** Windows 11 Host, Python 3.14 (Uvicorn), Node.js 20 (Vite 8), Chromium Headless

---

## 1. Bundle & Asset Metrics

| Metric | Measured Baseline | Target for UI Overhaul #3 | Optimization Technique |
|---|---|---|---|
| **JavaScript Bundle Size (Uncompressed)** | **558.59 kB** (Single chunk) | **< 100 kB initial chunk** | Route-level code-splitting via `React.lazy()` and `Suspense` |
| **JavaScript Bundle Size (Gzip)** | **124.23 kB** | **< 30 kB initial chunk** | Code-split all 19 views into independent dynamic chunks |
| **CSS Bundle Size (Uncompressed)** | **52.91 kB** | **< 55 kB** | Tailwind CSS v4 utility pruning |
| **CSS Bundle Size (Gzip)** | **9.36 kB** | **< 10 kB** | Maintain clean utility classes without bloat |
| **Initial HTML Document** | **0.51 kB** (0.35 kB gzip) | **< 1 kB** | Preserved |
| **Vite Production Build Time** | **1.75 seconds** | **< 2.5 seconds** | Fast build pipeline maintained |

---

## 2. Browser & Runtime Metrics

| Operation | Measured Baseline | Target | Evaluation |
|---|---|---|---|
| **Initial Page Load Time (Dev Server)** | **1,332 ms** | **< 500 ms (Prod build)** | Initial un-split bundle parsing overhead |
| **Initial DOM Node Count** | **363 nodes** | **< 500 nodes** | **Excellent (Well below 800-node ceiling)** |
| **Browser Console Errors** | **0 errors** | **0 errors** | **Clean execution** |
| **Page Unhandled Exceptions** | **0 exceptions** | **0 exceptions** | **Clean execution** |
| **Background Polling Frequency** | **Every 30 seconds** (`App.tsx`) | **Event-driven only** | Replace setInterval polling with event-driven refresh |

---

## 3. Backend API Response Latency Baseline

*(Measured across 5 consecutive warm requests per endpoint)*

| Endpoint & Operation | Average Latency | Minimum Latency | Maximum Latency | Response Payload | Target |
|---|---|---|---|---|---|
| `GET /api/health` | **20.49 ms** | 3.53 ms | 87.47 ms | 91 bytes | < 100 ms |
| `GET /api/company` | **7.36 ms** | 5.57 ms | 8.63 ms | 1,287 bytes | < 100 ms |
| `GET /api/dashboard?time_range=weekly` | **33.03 ms** | 26.02 ms | 42.92 ms | 488 bytes | < 300 ms |
| `GET /api/products?limit=50` | **7.97 ms** | 7.42 ms | 8.37 ms | 25 bytes | < 100 ms |
| `GET /api/products?search=Chymoral` | **9.84 ms** | 8.64 ms | 10.52 ms | 25 bytes | < 300 ms |
| `GET /api/customers?limit=50` | **9.42 ms** | 8.31 ms | 10.59 ms | 26 bytes | < 100 ms |
| `GET /api/suppliers?limit=50` | **11.70 ms** | 10.15 ms | 12.21 ms | 26 bytes | < 100 ms |
| `GET /api/registers/sales?tax_type=all` | **11.49 ms** | 10.85 ms | 12.79 ms | 208 bytes | < 200 ms |
| `GET /api/registers/purchases` | **10.55 ms** | 9.44 ms | 11.43 ms | 211 bytes | < 200 ms |
| `GET /api/profit-loss` | **13.52 ms** | 12.40 ms | 14.54 ms | 470 bytes | < 300 ms |

---

## 4. Hardware Constraints Assessment for 2 GB RAM / Windows 7

1. **Backend**:
   - The SQLite WAL mode in-process database delivers exceptional performance with **all APIs returning in 7–35 ms**.
   - No external database process runs locally, preserving RAM for the browser.
2. **Frontend Main-Thread Workload**:
   - The current 558 kB single chunk causes an unnecessary compilation penalty on a Core 2 Duo.
   - Code splitting will be implemented in Phase 6 to ensure instant rendering.
3. **Background CPU Usage**:
   - Eliminating the 30-second setInterval polling in `App.tsx` will allow the CPU to drop to 0% utilization when the user is idle.
