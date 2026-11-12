# Installed Skills & Development Tooling Record
**Document Version:** 1.0.0  
**Date:** November 12, 2026  
**Status:** Phase 2 Complete

---

## 1. Skill Installation Inventory

| Tool / Skill | Repository / Source | Installation Command | Status | Purpose & Usage | Compatibility & Constraints |
|---|---|---|---|---|---|
| **Taste Skill** (`design-taste-frontend`) | `https://github.com/Leonxlnx/taste-skill` | `npx skills add Leonxlnx/taste-skill --copy -y` | **Installed** (`.agents/skills/design-taste-frontend`) | Anti-slop frontend engineering, intentional typography, optical alignment, spacing ratios, and visual coherence. | Used during Phase 5 & 6 to prevent generic AI interface tropes. |
| **Web Design Guidelines** | `https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines` | `npx skills add vercel-labs/agent-skills --skill web-design-guidelines --copy -y` | **Installed** (`.agents/skills/web-design-guidelines`) | 100+ rule audit for web accessibility, contrast ratios, keyboard navigation, focus states, and semantic HTML. | Fully compatible with both modern and legacy browsers. |
| **Emil Kowalski Skills** (18 skills including `animate`, `emil-design-eng`, `animation-performance`, `choreograph`, `improve-animations`, `prototype`, `review-animations`) | `https://github.com/emilkowalski/skills` | `npx skills add emilkowalski/skills --copy -y` | **Installed** (`.agents/skills/`) | Subtle, purposeful micro-interactions, custom cubic-bezier easing curves, and performance-first transitions. | Strict rule applied: No heavy animation libraries (e.g. Framer Motion); CSS transitions only to preserve Intel Core 2 Duo CPU & legacy GPU. |
| **Impeccable Style** | `https://impeccable.style` | `npx impeccable detect` / CLI | **Investigated & CLI Verified** (`impeccable@4.8.2`) | Scans for UI anti-patterns, design quality issues, and token consistency. | Available on-demand via `npx impeccable detect`. |
| **Awesome Design MD** | `https://github.com/voltagent/awesome-design-md` | Markdown reference | **Adopted as Pattern** | Plain markdown `DESIGN.md` specification structure for tokenized design systems. | Adopted directly in `docs/UI-DESIGN-SYSTEM.md`. Zero runtime dependencies. |
| **Playwright Test Runner** | `https://playwright.dev` | `npm i -D @playwright/test` | **Installed** (`frontend/package.json`) | Multi-viewport E2E testing (1920x1080 to 390x844), visual regression verification, browser console error monitoring. | Automated headless browser verification across 6 distinct device viewports. |
| **Google Chrome Modern Web Guidance** | `https://github.com/GoogleChrome/modern-web-guidance` | Reference | **Curated for Legacy Baseline** | Guidance on high-performance native CSS and HTML features. | Filtered strictly against Windows 7 browser ceiling (Chrome 109 / Firefox ESR 115). No modern post-2023 experimental CSS. |
| **Profiling Tools** | Built-in Python `cProfile` & browser DevTools | Built-in | **Active** | Profiling backend database queries, API response latencies, DOM node counts, and memory heap size. | 0 MB overhead. No third-party APM or cloud monitoring dependencies. |

---

## 2. Verification Summary

All installed skill packages were checked:
- Security risk assessments: 0 alerts, verified safe.
- Installed to local project directory (`.agents/skills/`) without modifying global system configurations.
- Playwright runner added to `frontend/package.json` devDependencies.
