# design-prompt.md
## Agent Implementation Prompt — Allo ERP Multi-Page Dashboard

> Paste this entire file as your first message to the agent.  
> The agent must read `claude.md`, `architecture.md`, and `design-architecture.md` before writing a single line of code.

---

## CONTEXT

You are implementing the UI for **allo.erp**, an inventory reservation system built with Next.js 14 App Router, TypeScript, Prisma, and Tailwind CSS with shadcn/ui.

The backend API is already built. Your job is **frontend only** — pages, components, and wiring to the existing API endpoints. Do NOT touch any files in `app/api/`, `lib/`, or `prisma/`.

Read these files before starting:
1. `CLAUDE.md` — project conventions, forbidden patterns, env vars
2. `architecture.md` — data shapes, API response schemas
3. `design-architecture.md` — the complete design system (colors, typography, components, animations)

---

## DESIGN MANDATE

**Theme:** Dark Glassmorphism — deep navy backgrounds, glass-surface cards, electric indigo brand.  
**Font:** Import `Syne` (headings/UI) + `DM Mono` (numbers, timer, code) from Google Fonts in `app/layout.tsx`.  
**No shadcn defaults unstyled.** Every shadcn component must be overridden with the CSS variables from `design-architecture.md Section 2`.

The design system is defined in `app/globals.css`. All CSS variables MUST be added there before building any component.

---

## PHASE 1 — Global Styles & Layout Shell

### Step 1.1 — CSS Variables

Add ALL variables from `design-architecture.md Section 2` to `app/globals.css`:

```css
/* Paste the full :root block from design-architecture.md */
/* Include: --bg0 through --bg3, --border, --brand variants, */
/* --status-* colors, --glow-* colors, --text variants, */
/* --timer-* colors, --font-*, --space-*, --radius-*, */
/* and the .glass-card, .glass-elevated, .brand-glow utility classes */
```

Also add these Tailwind custom animations to `tailwind.config.ts`:
```typescript
animation: {
  'shimmer': 'shimmer 1.5s infinite',
  'fade-in': 'fadeIn 300ms ease-out',
  'slide-down': 'slideDown 300ms ease-out',
  'glow-pulse': 'glowPulse 2s ease-in-out infinite',
  'timer-pulse': 'timerPulse 1s ease-in-out infinite',
},
keyframes: {
  shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
  fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
  slideDown: { '0%': { transform: 'translateY(-8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
  glowPulse: { '0%, 100%': { boxShadow: '0 0 20px var(--brand-glow)' }, '50%': { boxShadow: '0 0 40px var(--brand-glow)' } },
  timerPulse: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
}
```

### Step 1.2 — Root Layout

Rewrite `app/layout.tsx` completely:

```typescript
// Requirements:
// - Import Syne (weights 400,500,600,700,800) and DM Mono (400,500) from next/font/google
// - Apply both fonts as CSS variables: --font-sans and --font-mono
// - Body: background var(--bg0), color var(--text1), overflow hidden, height 100vh
// - Include the <Navbar /> component (build this next)
// - The children render inside a <main> with overflow-y:auto
```

### Step 1.3 — Sidebar Layout Component

Create `components/layout/Sidebar.tsx` as a Client Component.

**Sidebar specs (from design-architecture.md Section 7):**
- Width: 220px expanded, 60px collapsed
- Background: `var(--bg1)`, right border: `1px solid var(--border)`
- `position: sticky; top: 0; height: 100vh`
- Collapse toggle button — when collapsed, icon-only mode (hide text labels with `opacity:0 width:0`)
- Transition: `width 200ms cubic-bezier(0.4,0,0.2,1)`

**Navigation items (in order):**
```typescript
const navItems = [
  { section: 'OVERVIEW', items: [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  ]},
  { section: 'INVENTORY', items: [
    { label: 'Inventory Items', href: '/inventory', icon: Package },
    { label: 'Warehouses', href: '/warehouses', icon: Warehouse },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  ]},
  { section: 'RESERVATIONS', items: [
    { label: 'Active Reservations', href: '/reservations', icon: Clock, badge: true },
  ]},
  { section: 'SYSTEM', items: [
    { label: 'Settings', href: '/settings', icon: Settings },
  ]},
]
```

The `badge` prop on Active Reservations fetches `GET /api/reservations/count` (create this endpoint) and shows a red pill with the count of PENDING reservations.

**Active state:** Use `usePathname()` from `next/navigation`. The active item gets:
- Background: `var(--brand-glow)`
- Color: `var(--brand2)`
- Border: `1px solid rgba(108,99,255,0.2)`
- Left accent bar: `3px solid var(--brand)`, absolutely positioned

**Org card** (above nav):
```
[MW avatar] Main Warehouse
            Standard Org
```
Hidden when collapsed.

**User footer** (bottom):
```
[JD avatar] John Doe
            Admin
```
Avatar only when collapsed.

### Step 1.4 — Topbar Component

Create `components/layout/Topbar.tsx` as a Client Component.

- Height: 54px, sticky top-0
- Background: `var(--bg0)`, bottom border: `1px solid var(--border)`
- Left: page title (read from a `usePageTitle` context or pass as prop)
- Center: status chips (Postgres Active ●, Redis Live ●, Port 3000 ●)
  - Fetch status from `GET /api/health` — create this endpoint if it doesn't exist
  - Chip style: `background:var(--bg2); border:1px solid var(--border); border-radius:999px; padding:4px 10px`
- Right: notification bell (badge with PENDING reservation count) + user avatar button

### Step 1.5 — Shell Layout

Create `components/layout/Shell.tsx`:
```tsx
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--bg0)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
```

Update `app/layout.tsx` to wrap children in `<Shell>`.

---

## PHASE 2 — Shared UI Components

Build these before any page, as all pages depend on them.

### Step 2.1 — KPI Card

Create `components/ui/KpiCard.tsx`:

```typescript
interface KpiCardProps {
  label: string
  value: string | number
  subtext: string
  delta?: { value: string; direction: 'up' | 'down' }
  variant: 'green' | 'blue' | 'amber' | 'red'
  icon: React.ReactNode
}
```

Specs from `design-architecture.md Section 5.1`:
- Background: `var(--bg1)`, border: `1px solid var(--border)`, border-radius: `var(--radius-xl)`
- Top accent line: 2px gradient, color based on variant, using the pattern:
  `background: linear-gradient(90deg, transparent, var(--status-{variant}), transparent)`
- Value: `var(--font-mono)`, 28px, 800 weight, colored by variant
- Delta badge: `var(--status-available)` bg if `up`, `var(--status-empty)` bg if `down`
- Icon: 38×38px rounded square, `var(--glow-{variant})` background

### Step 2.2 — GlassCard

Create `components/ui/GlassCard.tsx`:
```typescript
// Wrapper with glass-card styles from design-architecture.md
// backdrop-filter: blur(12px) saturate(180%)
// background: var(--bg-glass)
// border: 1px solid var(--border-glass)
// border-radius: var(--radius-lg)
// Props: children, className, padding (default: '20px')
```

### Step 2.3 — StatusBadge

Create `components/ui/StatusBadge.tsx`:
```typescript
type BadgeVariant = 'available' | 'low' | 'empty' | 'pending' | 'confirmed' | 'released' | 'expired' | 'warehouse'

// Rules:
// available (> 3 units): green dot + "N Available"
// low (1-3 units):       amber ⚠ + "Low: N"
// empty (0 units):       red dot + "Out of Stock"
// pending:               purple dot + "Pending"
// confirmed:             blue dot + "Confirmed"
// expired/released:      red dot + status name
// warehouse:             neutral, no dot
```

### Step 2.4 — PressureMeter

Create `components/ui/PressureMeter.tsx`:
```typescript
interface PressureMeterProps {
  totalUnits: number
  reservedUnits: number
  showDots?: boolean    // default true
  showBar?: boolean     // default false
  showLabel?: boolean   // default false
}

// Dots: 3 dots, filled based on availableUnits
// - 0 avail:   all empty, red color
// - 1-2 avail: 1 dot amber
// - 3-5 avail: 2 dots yellow-green
// - 6+ avail:  3 dots green

// Bar: 6px height, green/amber/red based on ratio
// Label: "N people reserving" if reservedUnits > 0
```

### Step 2.5 — ErrorAlert

Create `components/ui/ErrorAlert.tsx`:
```typescript
interface ErrorAlertProps {
  status: 409 | 410 | 500 | null
  onDismiss?: () => void
  onRetry?: () => void
}

// 409: amber left border, "Out of Stock" title, action button "See other warehouses →"
// 410: amber/orange left border, "Reservation Expired" title, action "Reserve again →"
// 500: red left border, "Something went wrong" title

// Animation: animate-slide-down on mount
// role="alert" for accessibility
// aria-live="polite"
```

### Step 2.6 — Skeleton Loader

Create `components/ui/ProductSkeleton.tsx`:
```typescript
// Shows 6 skeleton cards in a grid (2 col tablet, 3 col desktop)
// Shimmer animation: background-size 200% 100%, keyframe slides left-to-right
// Colors: var(--bg-elevated) → var(--bg-glass)
// Card shape: same dimensions as ProductCard
// Use this in app/loading.tsx
```

---

## PHASE 3 — Pages

### Step 3.1 — Dashboard Page (`app/page.tsx`)

Server Component. Fetches data on the server.

**Data fetching:**
```typescript
// Parallel fetch
const [products, reservations] = await Promise.all([
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/products`).then(r => r.json()),
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/reservations`).then(r => r.json()),
])

// Compute KPI values server-side:
const totalProducts = products.length
const totalInventory = products.reduce((sum, p) => sum + p.inventory.reduce((s, i) => s + i.totalUnits, 0), 0)
const activeReservations = reservations.filter(r => r.status === 'PENDING').length
const expiringSoon = reservations.filter(r => r.status === 'PENDING' && new Date(r.expiresAt) < new Date(Date.now() + 2 * 60 * 1000)).length
```

**Layout:**
```
Page header (h1 + subtitle)
KpiGrid (4 cards: Products, Inventory, Active Reservations, Expiring Soon)
Two-column section:
  Left (flex:1): InventoryTable component
  Right (340px): 
    ActivityFeed component (top)
    SystemHealth component (bottom)
```

**InventoryTable:**
- Search input (client-side filter, use 'use client' wrapper or client component)
- Table: Product | Warehouse | Total | Reserved | Available (bar) | Price
- Each available cell: mini `<PressureMeter showBar />` + number colored by status
- Rows sorted: out-of-stock first, then low, then available
- Click row → navigate to `/inventory`

**ActivityFeed:**
- Show last 10 reservation lifecycle events
- Format: colored dot icon | product name | "N Unit → Warehouse" | status badge | timestamp
- Auto-refresh: `router.refresh()` every 30 seconds via `useEffect`
- "LIVE" badge in header: pulsing red dot

**SystemHealth:**
- Static display: Prisma Client, Redis Cache, Cron Scheduler, Database Pool
- Fetch real status from `GET /api/health`

### Step 3.2 — Inventory Page (`app/inventory/page.tsx`)

Server Component with a `<InventoryClient>` child for interactivity.

**Layout:**
```
Page header
Toolbar: [Search] [Warehouse filter ▼] [Status filter ▼] [+ Add Product →]
Expandable product cards (one per product)
```

**Each ProductCard (`components/product/InventoryProductCard.tsx`):**
- Header (always visible):
  ```
  [emoji icon] Product Name          ₹Price   [expand chevron]
               N total · N available · N reserved
  ```
- Expanded body: table of warehouses
  ```
  WAREHOUSE | TOTAL | RESERVED | AVAILABLE | STATUS | ACTIONS
  Mumbai Central | 18 | 0 | 18 ████████ | ● 18 Available | [Edit] [Reserve]
  ```
  - Progress bar: `var(--status-available)` fill, colors based on ratio
  - [Reserve] button: opens a modal or navigates to reservation flow
  - Chevron rotates 180° when expanded via CSS transition

**Search:** Client-side filter on product name. Debounce 300ms.

**Filters:** Warehouse and Status dropdowns filter the visible cards. Implement with client state.

### Step 3.3 — Warehouses Page (`app/warehouses/page.tsx`)

Server Component.

**Data:** `GET /api/warehouses`

**Layout:**
```
Page header
3-column card grid (responsive: 1 col mobile, 2 col tablet, 3 col desktop)
Cross-warehouse comparison table (below the grid)
```

**Warehouse Card (`components/warehouse/WarehouseCard.tsx`):**
```
[🏭 icon]                    [● Active]
Mumbai Central
📍 Mumbai, Maharashtra
┌──────────────────────────┐
│ TOTAL UNITS  │ AVAILABLE │
│     43       │    41     │
│ green        │ green     │
├──────────────────────────┤
│ UTILISATION 62%          │
│ ████████████░░░░░░░░░░░  │
└──────────────────────────┘
```
- Hover: `translateY(-2px)`, border brightens, 200ms ease-out
- Click → navigate to `/analytics?warehouse=Mumbai+Central`

**Comparison Table:**
- Columns: Product | [Warehouse 1] | [Warehouse 2] | [Warehouse 3] | Total
- Each cell: big colored number (available) + `/total` in muted text
- Color: green if healthy, amber if low, red if zero

### Step 3.4 — Analytics Page (`app/analytics/page.tsx`)

Server Component + `<AnalyticsClient>` for chart interactivity.

**Data computed from products + reservations:**
```typescript
const reservationRate = (confirmedCount / totalCount) * 100
const avgHoldTime = // avg (confirmedAt - createdAt) for confirmed reservations
const expiryRate = (expiredCount / totalCount) * 100
const conflictCount = // would need to be tracked separately — show 0 or mock
```

**Layout:**
```
Page header
KPI row (4 cards: Reservation Rate, Avg Hold Time, Expiry Rate, 409 Conflicts)
Stock Utilisation panel (warehouse bars)
Reservation Status Breakdown panel (simple bar chart using divs)
```

**Utilisation bars (no chart library):**
```tsx
// For each warehouse:
<div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
  <span style={{ width: 140 }}>🏭 {name}</span>
  <div style={{ flex: 1, background: 'var(--bg3)', height: 8, borderRadius: 4 }}>
    <div style={{ width: `${util}%`, height: '100%', background: barColor, borderRadius: 4 }} />
  </div>
  <span style={{ minWidth: 40, textAlign: 'right', color: barColor }}>{util}%</span>
  <span style={{ color: 'var(--text3)', fontSize: 11 }}>{available}/{total} units</span>
</div>
```

### Step 3.5 — Active Reservations Page (`app/reservations/page.tsx`)

**Must be a Client Component** — needs live timers.

**Data:** `GET /api/reservations` (create this endpoint — fetch all reservations with product + warehouse)

**Layout:**
```
Page header
Filter pills: [All] [Pending] [Confirmed] [Expired / Released]
Reservation cards list
```

**Reservation Card (`components/reservation/ReservationListCard.tsx`):**
```
[Product Name]                    TIME LEFT    [Confirm] [Release]
[Warehouse · Qty N · ₹Price · badge]  08:42
```

**Timer behavior:**
- `useEffect` with `setInterval(1000)` on mount, clear on unmount
- Color transition based on seconds remaining:
  - `> 180s`: `var(--timer-safe)` — green
  - `60–180s`: `var(--timer-warning)` — amber
  - `< 60s`: `var(--timer-critical)` — red + `animate-timer-pulse`
  - `0s or expired`: "Expired" in `var(--text3)`

**Confirm button:**
- Calls `POST /api/reservations/:id/confirm`
- On 200: update card to show "Purchase complete" badge, remove buttons
- On 410: show inline `<ErrorAlert status={410} />` within the card
- Loading state: spinner

**Release button:**
- Calls `POST /api/reservations/:id/release`
- On 200: update status to released, remove buttons
- Loading state: spinner

**Empty state:**
```
[clock-off icon]
No reservations
Nothing in this status category
```

**Auto-refresh:** Poll `GET /api/reservations` every 30 seconds to pick up new reservations created from other sessions.

### Step 3.6 — Reservation Detail Page (`app/reservations/[id]/page.tsx`)

This is the shopper-facing checkout page. **Client Component.**

Refer to `design-architecture.md Section 5.3` for full spec.

**Layout:** Single column, `max-width: 640px`, centered.

**Sections:**
1. `← Back to products` link
2. Glass-elevated checkout card:
   - Product image (next/image), name, warehouse, qty, price
   - Countdown panel:
     - "YOUR RESERVATION IS HELD" label + [● LIVE] badge
     - Large monospace timer: `MM : SS`
     - Color transitions per timer state
     - Progress bar: full width, 6px, gradient fill
   - Action buttons (full width):
     - "✓ Confirm Purchase" — primary brand button
     - "Cancel Reservation" — ghost button
3. Error state (replaces buttons on failure)
4. Success state (replaces everything on confirm)

**Success state animation:**
```tsx
// Animated SVG checkmark — circle draws in, then check strokes in
// Use CSS stroke-dasharray/stroke-dashoffset animation
// 600ms total, --ease-spring
// Green glow background pulse
```

---

## PHASE 4 — Settings Page (`app/settings/page.tsx`)

Client Component (has interactive controls).

**Two-column layout:**

**Left panel — Reservation Settings:**
- Hold duration slider (2–30 min, default 10) with live value display
- Max units per reservation slider (1–10, default 3)
- Toggle: Enable idempotency keys (checkbox)
- Toggle: Auto-release on expiry (checkbox)
- Save button — `POST /api/settings` (mock — just show a success toast)

**Right panel — Infrastructure:**
- Database URL (masked: `neon://***@host/db`)
- Redis URL (masked)
- Cron secret (fully masked: ●●●●●●●●●●●●)
- Environment status badge (green "Production" or amber "Development")
- "Run Cron: Expire Reservations" button → calls `GET /api/cron/expire-reservations` with auth header, shows result toast

---

## PHASE 5 — Loading & Error States

### `app/loading.tsx`
```tsx
// Import ProductSkeleton
// Show 6 skeleton cards in the same grid as the product listing
// Also show skeleton KPI cards (4 cards, same dimensions as real ones)
```

### `app/error.tsx`
```tsx
'use client'
// Props: error, reset
// Show: red icon, "Something went wrong", error.message in mono font
// Button: "Try again" → calls reset()
// Button: "← Go home" → router.push('/')
```

### `app/not-found.tsx`
```tsx
// 404 page
// Show: large "404" in mono font (var(--brand2) color)
// "Page not found" subtitle
// "← Back to dashboard" link
```

---

## PHASE 6 — Missing API Endpoints

These endpoints don't exist yet. Create them:

### `GET /api/reservations`
Returns all reservations (not just one) with product + warehouse joined.
```typescript
// Query params: ?status=PENDING|CONFIRMED|RELEASED|EXPIRED (optional)
// Response: Reservation[] with product and warehouse nested
```

### `GET /api/reservations/count`
Returns count of PENDING reservations only. Used by the sidebar badge.
```typescript
// Response: { count: number }
```

### `GET /api/reservations/:id`
Already exists — returns single reservation with product + warehouse.

### `GET /api/health`
System health check.
```typescript
// Response:
{
  prisma: 'operational' | 'error',
  redis: 'operational' | 'error' | 'disabled',
  cron: 'idle' | 'running',
  timestamp: string
}
```

---

## IMPLEMENTATION RULES

### Forbidden patterns

```typescript
// NEVER do this — TOCTOU race condition
const item = await prisma.inventoryItem.findFirst(...)
if (item.availableUnits >= quantity) {
  await prisma.inventoryItem.update(...)
}

// NEVER use any
const data: any = await fetch(...)

// NEVER swallow errors silently
try { ... } catch {} // NO — always surface errors

// NEVER hardcode colors outside globals.css
style={{ color: '#22d3a0' }} // NO — use var(--status-available)
```

### Required patterns

```typescript
// Always type API responses with Zod
const result = ProductWithStockSchema.array().parse(data)

// Always show 409/410 to user
if (res.status === 409) setError(409)
if (res.status === 410) setError(410)

// Always clean up intervals
useEffect(() => {
  const id = setInterval(tick, 1000)
  return () => clearInterval(id) // cleanup on unmount
}, [])

// Timer font — always monospace to prevent layout shift
style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}

// Images — always use next/image with sizes prop
<Image src={product.imageUrl} alt={product.name} fill sizes="(max-width:640px) 100vw, 33vw" />
```

### Accessibility checklist (check every component)
- [ ] All interactive elements have visible focus ring: `outline: 2px solid var(--brand-400); outline-offset: 3px`
- [ ] Timer has `aria-live="polite"` region updated every 60 seconds
- [ ] Error alerts have `role="alert"`
- [ ] Disabled buttons have both `disabled` attribute AND `aria-disabled="true"`
- [ ] Images have meaningful `alt` text
- [ ] Color is never the ONLY indicator of status (always pair with text or icon)
- [ ] All animations wrapped in `@media (prefers-reduced-motion: no-preference)`

### Performance checklist
- [ ] `backdrop-filter` used on maximum 3 elements visible simultaneously
- [ ] Product images: `priority` prop on first 3 cards only
- [ ] Countdown timer: `setInterval` at 1000ms (not `requestAnimationFrame`)
- [ ] No Framer Motion except for the success checkmark animation
- [ ] No chart libraries — use CSS/div bars for all data visualisation
- [ ] `router.refresh()` instead of full page reload after mutations

---

## COMMIT ORDER

Commit after each phase:
```
feat: add global CSS design system and layout shell
feat: add shared UI components (KpiCard, StatusBadge, PressureMeter, ErrorAlert, Skeleton)
feat: implement Dashboard page with KPI grid and inventory table
feat: implement Inventory page with expandable product cards
feat: implement Warehouses page with card grid and comparison table
feat: implement Analytics page with utilisation bars
feat: implement Active Reservations page with live countdown timers
feat: implement Reservation Detail (checkout) page with animated confirm flow
feat: implement Settings page with infrastructure panel
feat: add missing API endpoints (reservations list, count, health)
fix: accessibility audit — focus rings, aria-live, role=alert
```

---

## DEFINITION OF DONE

The implementation is complete when:

1. All 6 sidebar tabs navigate to distinct, fully functional pages
2. The Reservations page shows live countdown timers that turn amber → red → pulse as time expires
3. Confirming a reservation shows the animated checkmark success state without a page reload
4. 409 and 410 errors are visually prominent — not just console.log
5. The concurrency test script (`scripts/test-concurrency.ts`) still passes — you have not broken the API
6. Mobile responsive: 1-col product grid at < 640px, bottom-fixed action buttons on reservation detail
7. No TypeScript errors (`tsc --noEmit` passes)
8. All timers clean up on unmount (no memory leaks in React DevTools)
9. Live URL works end-to-end: browse → reserve → countdown → confirm

---

## QUICK REFERENCE — Color Usage

| Situation | Token to use |
|-----------|-------------|
| Available stock (healthy) | `var(--status-available)` |
| Low stock (1–3 units) | `var(--status-low)` |
| Out of stock | `var(--status-empty)` |
| Pending reservation | `var(--status-reserved)` |
| Confirmed reservation | `var(--status-confirmed)` |
| Timer > 3 min | `var(--timer-safe)` |
| Timer 1–3 min | `var(--timer-warning)` |
| Timer < 1 min | `var(--timer-critical)` |
| Primary CTA button | `var(--brand-500)` |
| Brand hover | `var(--brand-400)` |
| Page backgrounds | `var(--bg0)` |
| Card backgrounds | `var(--bg1)` |
| Elevated surfaces | `var(--bg2)` |
| Hover/input backgrounds | `var(--bg3)` |
| Primary text | `var(--text-primary)` |
| Secondary text | `var(--text-secondary)` |
| Muted text/labels | `var(--text-muted)` |