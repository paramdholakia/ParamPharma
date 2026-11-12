# Performance Engineering Report & Target Benchmarks
**Date:** November 12, 2026  
**Status:** Pre-Optimization Baseline Documented

---

## 1. Executive Summary

A comprehensive performance profile was measured on November 12, 2026 across both the Python FastAPI backend and the React 19 / Vite frontend.

The embedded SQLite database with Write-Ahead Logging (`PRAGMA journal_mode=WAL`) and `PRAGMA synchronous=NORMAL` performs exceptionally well, with all core financial queries returning in **under 35 ms** (well below the 300 ms target).

The primary performance bottleneck identified is the **un-split 558.59 kB monolithic JavaScript bundle** in the frontend, along with unconditional 30-second interval polling on the client.

---

## 2. Before vs. Target Benchmarks

| Domain / Operation | Baseline (Measured) | Target for Overhaul #3 | Planned Engineering Action |
|---|---|---|---|
| **Initial JS Download** | 558.59 kB (124.23 kB gzip) | < 90 kB (< 28 kB gzip) | Code-split 19 page views with `React.lazy` |
| **Medicine Search** | 9.84 ms | < 300 ms | **Already beating target** (9.84 ms) |
| **Sales Register Query** | 11.49 ms | < 200 ms | **Already beating target** (11.49 ms) |
| **P&L Financial Run** | 13.52 ms | < 300 ms | **Already beating target** (13.52 ms) |
| **Dashboard KPI Aggregate** | 33.03 ms | < 300 ms | **Already beating target** (33.03 ms) |
| **DOM Tree Size** | 363 nodes | < 500 nodes | **Already beating target** (363 nodes) |
| **Client Background Polling** | Every 30s | Event-driven only | Switch to focus-based / transaction-driven refresh |
| **Animation Overhead** | Instant | Low-cost CSS transitions | Subtle CSS cubic-bezier curves (no JS physics) |

---

## 3. Legacy Optimization Checklist for Windows 7 & 2 GB RAM

- [x] Composite database indexes for FEFO batch sorting.
- [x] In-memory temporary SQLite storage (`PRAGMA temp_store=MEMORY`).
- [x] Zero heavy third-party charting libraries (Dashboard uses lightweight SVG bars).
- [ ] Implement `React.lazy()` route-level code-splitting for all 19 ERP views.
- [ ] Replace 30-second `setInterval` in `App.tsx` with event-driven window focus listener.
- [ ] Ensure all file download object URLs invoke `URL.revokeObjectURL`.
- [ ] Avoid GPU-heavy `backdrop-filter: blur(...)` to protect legacy Intel GMA graphics.
