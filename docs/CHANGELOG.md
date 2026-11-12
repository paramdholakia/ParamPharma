# Project Changelog & Revision History
All notable changes to the Param Pharma Wholesale ERP system are documented in this file.

---

## [v3.0.0] — November 12, 2026: UI Overhaul #3, Performance Engineering & Architecture Roadmap

### Added
- **Route-Level Code-Splitting**: Split all 19 ERP views into independent dynamic chunks via `React.lazy()` and `<Suspense>`, reducing initial JavaScript bundle from 558 kB to 264 kB (> 52% reduction).
- **Executive UI Design System (`docs/UI-DESIGN-SYSTEM.md`)**: High-density typography, tabular numerals (`tabular-nums`), hairline dividers, and custom cubic-bezier easing curves (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Playwright Automated Browser Suite (`frontend/tests/baseline_e2e.mjs`)**: Verified real headless Chromium execution across 6 screen viewports (1920x1080 down to 390x844) with 0 console errors and 0 uncaught exceptions.
- **Statutory GST Test Suite (`tests/test_statutory_gst.py`)**: Added unit tests for decimal-safe Indian GST rounding (`ROUND_HALF_UP`), 50/50 intra-state CGST/SGST splits, 100% inter-state IGST, and non-GST bills of supply.
- **Future Mobile Architecture Specification (`docs/MOBILE-ARCHITECTURE.md`)**: Evaluated React Native (Expo) vs Flutter, recommended React Native with Expo, and designed token security and ESC/POS thermal printing.
- **Zero-Cost Remote Deployment Strategy (`docs/DEPLOYMENT-PLAN.md`)**: Documented Hybrid Cloud (Vercel + Render + Atlas M0) and Zero-Trust Tunnel (Cloudflare Tunnel to Local PC at ₹0/month).
- **Installed Skills (`docs/INSTALLED-SKILLS.md`)**: Integrated `taste-skill`, `web-design-guidelines`, and `emilkowalski/skills` for UI polish without heavy runtime dependencies.

### Performance & Hardware Optimizations
- **Initial Bundle Reduction**: 558.59 kB down to 264.38 kB (83.26 kB gzipped) — eliminated Vite 500 kB chunk warning.
- **CPU Idle Optimization**: Replaced unconditional 30-second `setInterval` background polling in `App.tsx` with event-driven window focus listener, allowing the Intel Core 2 Duo CPU to remain idle.
- **Eliminated Expensive GPU Filters**: Removed `backdrop-blur-xs` from modals to protect legacy Intel GMA integrated graphics on Windows 7.
- **Lean DOM Tree**: Verified initial DOM node count of 376 nodes (well under the 800-node ceiling for 2 GB DDR2 RAM).

### Changed & Corrected
- **Company Settings**: Verified city set to "Bhuj, Kutch" and pincode "370001", matching statutory jurisdiction `Subject to Bhuj, Kutch (Gujarat) - 370001 jurisdiction only.`.
- **Git Checkpoint**: Created `ui-overhaul-3` branch and `pre-ui-overhaul-3` tag pushed to GitHub remote `origin`.

---

## [v2.0.0] — November 12, 2026: Enhancements & Statutory Alignment
- Implemented Excel (`.xlsx`) and PDF invoice export.
- Explicit statutory tax breakdown for CGST, SGST, and IGST with HSN Tax Analysis table.
- NPCI-compliant dynamic UPI QR Code generator (`aldholakia72-1@okaxis` / `9429041051`).
- Non-GST retail billing mode ("Bill of Supply").
- Editable Purchase Register with automatic batch quantity and supplier ledger rollback.
- Set P&L Tax Provision strictly to 0% per client instruction.
- Dynamic interactive dashboard with multi-point trend graph and velocity metrics.
