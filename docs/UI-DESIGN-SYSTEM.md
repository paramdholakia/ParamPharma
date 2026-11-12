# Param Pharma — Executive UI Design System & Visual Specification
**Document Version:** 1.0.0  
**Date:** November 12, 2026  
**Status:** Approved Design Direction for UI Overhaul #3

---

## 1. Design Philosophy: Executive Pharmaceutical Precision

Param Pharma is a daily operational tool for an Indian wholesale pharmaceutical distributor. The user makes hundreds of rapid keyboard entries, scans batch numbers, calculates statutory taxes, and prints legally binding invoices.

The design principles are:
1. **Precision & Trust**: Clean, crisp hairline dividers, unambiguous typography, and high-contrast labels. It must look like high-grade enterprise software (similar to Linear or Stripe Dashboard), not an experimental AI toy or raw wireframe.
2. **High Information Density**: Screen real estate is precious. Padding, row heights, and font sizes are tuned for dense tabular data so invoices and registers display maximum records without unnecessary vertical scrolling.
3. **Tabular Numerals First**: All currency values (₹), GST rates (%), quantities, HSN codes, and batch numbers use monospace tabular numerals (`tabular-nums font-mono`) so numbers align strictly on decimal points.
4. **Performance-First Micro-Interactions**: Smooth hover and focus states using native CSS transitions (`cubic-bezier(0.16, 1, 0.3, 1)` with 120–150ms duration). **Zero JavaScript animation libraries, zero GPU-heavy blur filters** (`backdrop-filter`) to protect legacy Intel Core 2 Duo systems and integrated graphics.

---

## 2. Color Palette & Semantic Tokens

### 2.1 Neutral Surfaces & Typography
| Token | Light Mode (Tailwind) | Dark Mode (Tailwind) | Usage |
|---|---|---|---|
| **App Canvas** | `bg-slate-100` (`#f1f5f9`) | `bg-slate-950` (`#020617`) | Deep application background |
| **Card / Surface** | `bg-white` (`#ffffff`) | `bg-slate-900` (`#0f172a`) | Module containers, tables, modal bodies |
| **Elevated Surface** | `bg-slate-50` (`#f8fafc`) | `bg-slate-850` (`#111c30`) | Table headers, summary strips, inactive tabs |
| **Hairline Border** | `border-slate-200` (`#e2e8f0`) | `border-slate-800` (`#1e293b`) | Clean structural dividers |
| **Strong Border** | `border-slate-300` (`#cbd5e1`) | `border-slate-700` (`#334155`) | Interactive inputs, active modal borders |
| **Primary Text** | `text-slate-900` (`#0f172a`) | `text-slate-100` (`#f8fafc`) | Headings, invoice amounts, party names |
| **Secondary Text**| `text-slate-600` (`#475569`) | `text-slate-400` (`#94a3b8`) | Field labels, timestamps, metadata |
| **Muted Text** | `text-slate-400` (`#94a3b8`) | `text-slate-500` (`#64748b`) | Placeholders, inactive hints |

### 2.2 Semantic & Regulatory Accents
| State | Accent (Light / Dark) | Tailwind Class | Application in Pharma Domain |
|---|---|---|---|
| **Brand Primary** | Deep Sapphire (`#2563eb` / `#3b82f6`) | `bg-blue-600 text-white` | Primary actions, "Generate Bill", active nav |
| **Compliance Green** | Emerald (`#059669` / `#10b981`) | `bg-emerald-600 text-white` | Active stock, paid invoices, credit notes, settled balance |
| **Warning / Alert** | Amber (`#d97706` / `#f59e0b`) | `bg-amber-500 text-slate-900` | Expiry within 90 days, overdue balances, low stock |
| **Hazard / Expired** | Crimson (`#dc2626` / `#ef4444`) | `bg-rose-600 text-white` | Expired medicines (blocked), damaged write-offs |
| **Neutral Informational**| Indigo / Slate (`#4f46e5` / `#6366f1`)| `bg-indigo-600 text-white` | HSN codes, software tutorial, GST rate pills |

---

## 3. Typography Scale & Hierarchy

| Role | Font Family | Size / Line Height | Tracking | Weight |
|---|---|---|---|---|
| **Display / Brand** | System Sans / Inter Fallback | `18px / 24px` | `-0.02em` | Bold (`700`) |
| **Section Header** | System Sans / Inter Fallback | `15px / 20px` | `-0.015em`| Semi-bold (`600`) |
| **Table Headings** | System Sans / Inter Fallback | `11px / 16px` | `+0.04em` | Bold (`700`) Uppercase |
| **Body / Labels** | System Sans / Inter Fallback | `13px / 18px` | `normal` | Medium (`500`) |
| **Tabular Numbers** | System Monospace | `12px - 14px` | `normal` | Semi-bold (`600`) `tabular-nums` |
| **Micro Badges** | System Sans / Monospace | `10px / 12px` | `+0.02em` | Bold (`700`) |

---

## 4. Components & Interactive Patterns

### 4.1 Buttons
- **Primary Action**: Solid background (`bg-blue-600 hover:bg-blue-700 active:scale-[0.98]`), crisp 1px border, subtle shadow.
- **Secondary Action**: Bordered (`border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200`).
- **Danger Action**: Rose accent (`bg-rose-600 hover:bg-rose-700 text-white`).
- **Timing Curve**: `transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1)`.

### 4.2 Data Entry & Inputs
- **Number Inputs**: Zero stubborn default values; single-keystroke replacement via `BrutalistNumberInput.tsx`.
- **Search Dropdowns**: Instant search suggestions popover upon focus showing top fast-moving medicines or customers.
- **Focus Ring**: Crisp 2px focus ring (`focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 outline-none`).

### 4.3 High-Density Data Tables
- **Sticky Header**: `sticky top-0 bg-slate-100 dark:bg-slate-850 z-10 border-b border-slate-200 dark:border-slate-800`.
- **Zebra Hover**: `hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors duration-100`.
- **Compact Padding**: `px-3 py-2 text-xs` for dense rows.
- **Fixed-Width Numerical Columns**: Rate, MRP, Qty, Free, Taxable, CGST, SGST, Total columns have predetermined min-widths with right-aligned tabular numerals.

---

## 5. Responsive & Resizable Architecture

- **Desktop (1920 × 1080 & 1366 × 768)**: Full multi-column view with side-by-side transaction summary card and billing item counter.
- **Legacy Displays (1280 × 720 & 1024 × 768)**:
  - Sidebar automatically collapses to icon-only mode (`w-16`) to maximize billing workspace width.
  - Horizontal scroll container with smooth momentum scrolling for dense billing tables.
- **Tablet & Mobile (768 × 1024 & 390 × 844)**:
  - Responsive card-based item summaries for billing and register rows.
  - Floating bottom drawer for invoice totals and payment actions.

---

## 6. Performance Engineering Constraints

1. **No Layout Shift (CLS = 0)**: Fixed heights on cards, skeleton placeholders during lazy chunk loading.
2. **Zero Animation Cost on Idle**: All CSS transitions are strictly state-triggered (`:hover`, `:focus`, `:active`), never continuously animating in infinite loops.
3. **No Heavy Filters**: Zero `backdrop-filter: blur()`. Modals use standard semi-transparent solid scrims (`bg-slate-900/60`).
