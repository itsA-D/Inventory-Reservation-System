# design-architecture.md
## Allo — UI/UX Design System & Architecture

> Design direction: **Dark Glassmorphism** — moody, premium, depth-layered.  
> Not trendy for the sake of it. Every visual choice serves the core UX goal:  
> make the reservation system's invisible infrastructure *visible and trustworthy* to the user.

---

## 1. Design Philosophy

### Core Principles

| Principle | What it means in this app |
|-----------|--------------------------|
| **Urgency without anxiety** | Countdown timers create pressure without panic. Color transitions guide, not alarm. |
| **Invisible infrastructure** | The reservation system should feel like "the store is holding this for you" — not "a database row exists" |
| **Progressive disclosure** | Stock info is compact by default, rich on hover/focus |
| **Zero silent failures** | 409 and 410 errors are prominent, human, and actionable |
| **Dark by default** | Dark mode is the primary theme. It signals premium, reduces eye strain, and makes colored status indicators (green/amber/red) pop |

---

## 2. Color System

### Base Palette

```css
:root {
  /* Backgrounds — layered depth */
  --bg-base:       #0a0a0f;   /* deepest layer — page background */
  --bg-surface:    #12121a;   /* cards, panels */
  --bg-elevated:   #1a1a28;   /* modals, dropdowns, hover states */
  --bg-glass:      rgba(255, 255, 255, 0.04); /* glassmorphism fill */
  --bg-glass-hover:rgba(255, 255, 255, 0.07);

  /* Glass borders */
  --border-glass:  rgba(255, 255, 255, 0.08);
  --border-glass-strong: rgba(255, 255, 255, 0.14);

  /* Brand — Electric Indigo */
  --brand-500:     #6366f1;   /* primary actions */
  --brand-400:     #818cf8;   /* hover */
  --brand-300:     #a5b4fc;   /* subtle accents */
  --brand-glow:    rgba(99, 102, 241, 0.25);

  /* Status */
  --status-available:   #10b981;  /* green — stock available */
  --status-low:         #f59e0b;  /* amber — 1–3 units */
  --status-empty:       #ef4444;  /* red — out of stock */
  --status-reserved:    #8b5cf6;  /* purple — reserved/pending */
  --status-confirmed:   #10b981;  /* green — confirmed */
  --status-expired:     #ef4444;  /* red — expired */

  /* Status glow variants */
  --glow-available:  rgba(16, 185, 129, 0.2);
  --glow-low:        rgba(245, 158, 11, 0.2);
  --glow-empty:      rgba(239, 68, 68, 0.2);
  --glow-reserved:   rgba(139, 92, 246, 0.2);

  /* Text */
  --text-primary:   #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted:     #475569;
  --text-inverse:   #0a0a0f;

  /* Countdown timer states */
  --timer-safe:     #10b981;   /* > 3 min */
  --timer-warning:  #f59e0b;   /* 1–3 min */
  --timer-critical: #ef4444;   /* < 1 min — also pulse animation */
}
```

### Glassmorphism Recipe

```css
/* Standard glass card */
.glass-card {
  background: var(--bg-glass);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid var(--border-glass);
  border-radius: 16px;
}

/* Elevated glass (modals, checkout panel) */
.glass-elevated {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px) saturate(200%);
  border: 1px solid var(--border-glass-strong);
  box-shadow:
    0 0 0 1px var(--border-glass),
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Brand glow effect (CTA buttons, active states) */
.brand-glow {
  box-shadow:
    0 0 20px var(--brand-glow),
    0 4px 12px rgba(0, 0, 0, 0.3);
}
```

---

## 3. Typography

```css
/* Font stack */
--font-sans:  'Inter Variable', 'Inter', system-ui, sans-serif;
--font-mono:  'JetBrains Mono', 'Fira Code', monospace; /* for timer digits */

/* Scale */
--text-xs:    0.75rem;    /* 12px — labels, badges */
--text-sm:    0.875rem;   /* 14px — body secondary */
--text-base:  1rem;       /* 16px — body primary */
--text-lg:    1.125rem;   /* 18px — card titles */
--text-xl:    1.25rem;    /* 20px — section headers */
--text-2xl:   1.5rem;     /* 24px — page headers */
--text-3xl:   1.875rem;   /* 30px — countdown digits */
--text-4xl:   2.25rem;    /* 36px — hero elements */

/* Weight */
--font-normal:  400;
--font-medium:  500;
--font-semibold:600;
--font-bold:    700;

/* Letter spacing (critical for countdown readability) */
--tracking-tight:  -0.025em;
--tracking-wider:   0.05em;  /* use on countdown digits */
--tracking-widest:  0.1em;   /* use on status labels/badges */
```

---

## 4. Spacing & Layout

```css
/* Base unit: 4px */
--space-1:   0.25rem;   /* 4px */
--space-2:   0.5rem;    /* 8px */
--space-3:   0.75rem;   /* 12px */
--space-4:   1rem;      /* 16px */
--space-5:   1.25rem;   /* 20px */
--space-6:   1.5rem;    /* 24px */
--space-8:   2rem;      /* 32px */
--space-10:  2.5rem;    /* 40px */
--space-12:  3rem;      /* 48px */
--space-16:  4rem;      /* 64px */

/* Border radius */
--radius-sm:   6px;
--radius-md:   10px;
--radius-lg:   16px;
--radius-xl:   20px;
--radius-full: 9999px;  /* pill badges */

/* Layout grid */
--max-w-content: 1280px;
--max-w-checkout: 640px;  /* narrower for focus */
--sidebar-w: 280px;
```

---

## 5. Component Specifications

### 5.1 Navbar

```
┌──────────────────────────────────────────────────────────┐
│  ◆ allo.          [Products]  [Warehouses]      [●] Live │
└──────────────────────────────────────────────────────────┘
```

- **Height:** 64px
- **Background:** `rgba(10, 10, 15, 0.8)` + `backdrop-filter: blur(20px)`
- **Border-bottom:** `1px solid var(--border-glass)`
- **Position:** `sticky top-0 z-50`
- **Brand mark "◆ allo.":** Brand indigo color, semibold, slight letter-spacing
- **Live indicator:** Pulsing green dot — signals real-time stock data

---

### 5.2 Product Card

```
┌──────────────────────────────────┐
│  [Product Image — 16:9 ratio]    │  ← aspect-ratio: 16/9, object-cover
│                         [badge]  │  ← warehouse count badge
├──────────────────────────────────┤
│  Product Name              ₹XXX  │
│  Short description               │
├──────────────────────────────────┤
│  STOCK BY WAREHOUSE              │
│  ┌─────────────────────────────┐ │
│  │ Mumbai Central  ●●●  3 left │ │  ← pressure dots
│  │              [Reserve →]   │ │
│  ├─────────────────────────────┤ │
│  │ Delhi North     ○○○  Sold   │ │  ← empty = greyed out
│  │              [Out of Stock] │ │
│  └─────────────────────────────┘ │
└──────────────────────────────────┘
```

**Card specs:**
- Background: `var(--bg-glass)` with `backdrop-filter: blur(12px)`
- Border: `1px solid var(--border-glass)`
- Border-radius: `var(--radius-lg)` = 16px
- On hover: border brightens to `var(--border-glass-strong)`, card lifts `translateY(-2px)`, transition 200ms ease

**Stock dots (Pressure Meter):**
- 1 filled dot = low (1–2 units) → amber
- 2 filled dots = medium (3–5 units) → yellow-green
- 3 filled dots = healthy (6+ units) → green
- All empty = sold out → red, dots greyed

**Reserve button:**
- Solid `var(--brand-500)` fill with `var(--brand-glow)` box-shadow
- On hover: `var(--brand-400)` + glow intensifies
- Loading state: spinner replaces text, button disabled
- Sold out: ghost style, disabled, cursor-not-allowed

---

### 5.3 Reservation Countdown Page

```
┌─────────────────────────────────────────────────────┐
│  ← Back to products                                  │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  YOUR RESERVATION                            │   │
│  │                                              │   │
│  │  [Product Image — 80px]                      │   │
│  │  Leather Sneakers                            │   │
│  │  Mumbai Central Warehouse         ₹3,499     │   │
│  │  Qty: 1                                      │   │
│  │                                              │   │
│  │  ┌──────────────────────────────────────┐   │   │
│  │  │   HELD FOR               [●LIVE]     │   │   │
│  │  │                                      │   │   │
│  │  │       08 : 42 : 15                   │   │   │
│  │  │     min   sec   ms(opt)              │   │   │
│  │  │                                      │   │   │
│  │  │  ████████████████████░░░░░  87%      │   │   │
│  │  └──────────────────────────────────────┘   │   │
│  │                                              │   │
│  │  [  ✓  Confirm Purchase  ]                   │   │
│  │  [     Cancel Reservation ]                  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Timer display:**
- Font: `var(--font-mono)`, size `var(--text-4xl)`, bold
- Letter-spacing: `var(--tracking-wider)` — prevents layout shift as digits change
- Color transitions:
  - > 180s (3 min): `var(--timer-safe)` — green
  - 60–180s: `var(--timer-warning)` — amber, smooth transition
  - < 60s: `var(--timer-critical)` — red + `animate-pulse`
  - 0s: frozen, "RESERVATION EXPIRED" replaces digits

**Progress bar:**
- Full width, height 6px, `border-radius: 3px`
- Background: `var(--bg-elevated)`
- Fill: gradient from `var(--timer-safe)` → `var(--timer-warning)` → `var(--timer-critical)` based on % remaining
- Transitions: smooth 1s linear

**Confirm button:**
- Full width, height 52px, `border-radius: var(--radius-md)`
- Background: `var(--brand-500)`, glow shadow
- On hover: scale(1.01), glow intensifies
- Loading: spinner + "Processing..." text
- Success: background → green, checkmark icon + "Purchase Confirmed!"

**Cancel button:**
- Ghost style — transparent bg, `border: 1px solid var(--border-glass-strong)`
- Text: `var(--text-secondary)`
- On hover: bg → `var(--bg-elevated)`, text → `var(--text-primary)`

---

### 5.4 Error States

**409 — Insufficient Stock:**
```
┌─────────────────────────────────────────────────────┐
│  ⚠  Out of Stock                                     │
│  Someone just grabbed the last unit at this         │
│  warehouse. Try another location or check back.     │
│                          [See other warehouses →]   │
└─────────────────────────────────────────────────────┘
```
- Background: `rgba(239, 68, 68, 0.08)` — subtle red tint
- Left border: `4px solid var(--status-empty)`
- Icon: amber warning triangle (not red — calmer)
- Animate: slides down from top, fade in

**410 — Reservation Expired:**
```
┌─────────────────────────────────────────────────────┐
│  ⏰  Your hold has expired                           │
│  Your 10-minute reservation has ended.              │
│  The item may still be available.                   │
│                          [Reserve again →]          │
└─────────────────────────────────────────────────────┘
```
- Background: `rgba(245, 158, 11, 0.08)` — amber tint
- Left border: `4px solid var(--status-low)`
- CTA button inline — one tap to retry

---

### 5.5 Success State (Post-Confirm)

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│              ✓                                       │
│         (animated checkmark)                         │
│                                                      │
│         Purchase Confirmed!                          │
│    Your order has been placed. Check your           │
│    email for confirmation details.                   │
│                                                      │
│              [← Continue Shopping]                   │
│                                                      │
└─────────────────────────────────────────────────────┘
```
- Full panel replacement (no page navigation)
- Animated SVG checkmark: circle draws in, then checkmark strokes in, 600ms total
- Background transitions to subtle green glow: `var(--glow-available)`

---

### 5.6 Loading Skeleton

```
┌──────────────────────────────────┐
│  ████████████████████████████░░  │  ← shimmer image placeholder
│  ████████████         ██████░░░  │  ← name + price shimmer
│  ████████████████████░░░░░░░░░░  │  ← description shimmer
│  ████████████░░   ██████░░░░░░░  │  ← warehouse row shimmer
└──────────────────────────────────┘
```
- Shimmer animation: `background-size: 200% 100%`, keyframe slide left-to-right
- Color: `var(--bg-elevated)` → `var(--bg-glass)` shimmer
- 6 skeleton cards on initial load

---

## 6. Animation System

### Motion Tokens

```css
/* Duration */
--duration-fast:   100ms;
--duration-normal: 200ms;
--duration-slow:   350ms;
--duration-xslow:  600ms;  /* success animations */

/* Easing */
--ease-out:      cubic-bezier(0.0, 0.0, 0.2, 1);
--ease-in-out:   cubic-bezier(0.4, 0.0, 0.2, 1);
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1); /* bounce for success */
```

### Micro-interaction Catalog

| Element | Trigger | Animation |
|---------|---------|-----------|
| Product card | hover | translateY(-2px), border brightens, 200ms ease-out |
| Reserve button | hover | scale(1.02), glow intensifies, 150ms |
| Reserve button | click | scale(0.98), 100ms, then spin loader |
| Error alert | mount | slideDown + fadeIn, 300ms ease-out |
| Timer digits | change | no transition — instant for accuracy |
| Timer color | threshold cross | color transition 800ms ease-in-out |
| Progress bar | every second | width transition 1000ms linear |
| Success checkmark | mount | SVG stroke animation 600ms ease-spring |
| Page load | first render | staggered card fade-in, 50ms delay per card |
| Stock badge | update | brief flash (background pulse 400ms) |

### Tailwind CSS Implementation

```javascript
// tailwind.config.ts additions
module.exports = {
  theme: {
    extend: {
      animation: {
        'shimmer': 'shimmer 1.5s infinite',
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 300ms ease-out',
        'slide-down': 'slideDown 300ms ease-out',
        'checkmark': 'checkmark 600ms ease-spring forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px var(--brand-glow)' },
          '50%': { boxShadow: '0 0 40px var(--brand-glow)' },
        },
      },
    },
  },
}
```

---

## 7. Page Layouts

### 7.1 Product Listing (`/`)

```
[Navbar — sticky]
────────────────────────────────────────────────
[Hero bar: "allo." wordmark + "N products across M warehouses" subtitle]
[Search/filter row: Search input | Warehouse filter dropdown | Sort]
────────────────────────────────────────────────
[Product Grid]
  col: 1 (mobile < 640px)
  col: 2 (tablet 640–1024px)
  col: 3 (desktop > 1024px)
  gap: 24px
  padding: 24px (mobile) / 48px (desktop)
────────────────────────────────────────────────
[Footer: minimal — "allo. © 2024"]
```

### 7.2 Reservation Detail (`/reservations/[id]`)

```
[Navbar — sticky]
────────────────────────────────────────────────
[Single column, max-width: 640px, centered]
[← Back link]
[Checkout card — glass-elevated]
  ├── Product summary row
  ├── Countdown panel
  ├── Action buttons
  └── Error/success state (replaces buttons)
────────────────────────────────────────────────
```

---

## 8. Responsive Behavior

| Breakpoint | Name | Layout changes |
|------------|------|---------------|
| < 640px | Mobile | 1-col grid, full-width cards, bottom-fixed action buttons on reservation page |
| 640–1024px | Tablet | 2-col grid, standard layout |
| > 1024px | Desktop | 3-col grid, wider padding, hover effects active |

**Mobile-specific rules:**
- Action buttons on reservation page: `position: fixed; bottom: 0; left: 0; right: 0; padding: 16px` — thumb-reachable
- Timer digits: reduce from `text-4xl` to `text-3xl`
- Cards: no hover lift (touch devices), tap state instead (`active:scale-99`)

---

## 9. Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Color contrast | All text on glass backgrounds must meet WCAG AA (4.5:1). Test with `--text-primary` on `--bg-glass` |
| Focus states | Custom focus ring: `outline: 2px solid var(--brand-400); outline-offset: 3px` — visible on all interactive elements |
| Screen reader | Timer announces remaining time every 60s via `aria-live="polite"` region |
| Error states | Errors use `role="alert"` for immediate screen reader announcement |
| Reduced motion | Wrap all CSS animations in `@media (prefers-reduced-motion: no-preference)`. Remove shimmer, remove hover lifts, keep timer color transitions |
| Semantic HTML | `<main>`, `<section>`, `<article>` on cards; `<time dateTime={expiresAt}>` for the timer |
| Button states | Disabled buttons have `aria-disabled="true"` AND `disabled` attribute |

---

## 10. Performance Rules

- `backdrop-filter` only on elements that need it — it's expensive on GPU. Max 3 simultaneously rendered.
- Product images: `next/image` with `sizes` prop, WebP format, lazy loading except first 3 cards (`priority`)
- Timer: `setInterval` at 1000ms — not `requestAnimationFrame`. No layout shifts; use monospace font to prevent digit width changes.
- No heavy chart libraries for the pressure meter — pure CSS/HTML progress bars.
- Framer Motion: only use for the success checkmark SVG animation. Everything else is CSS.

---

## 11. File Map for Implementation

```
app/
├── globals.css              ← All CSS variables defined here
│
components/
├── ui/
│   ├── GlassCard.tsx        ← Base glass card wrapper
│   ├── StatusBadge.tsx      ← ● Available / ○ Sold Out badges
│   ├── PressureMeter.tsx    ← Stock pressure dots + bar
│   └── ErrorAlert.tsx       ← 409/410 styled alerts
│
├── product/
│   ├── ProductGrid.tsx      ← Responsive grid wrapper
│   ├── ProductCard.tsx      ← Full product card
│   └── ProductSkeleton.tsx  ← Loading skeleton
│
├── reservation/
│   ├── CountdownTimer.tsx   ← Timer digits + progress bar + color logic
│   ├── ReservationCard.tsx  ← Full checkout panel
│   └── SuccessState.tsx     ← Post-confirm animated success
│
└── layout/
    ├── Navbar.tsx
    └── PageShell.tsx        ← Max-width container + padding
```