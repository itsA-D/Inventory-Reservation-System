# prompt.md
## Step-by-Step AI Prompts to Build the Allo Reservation System

Use these prompts in sequence with Claude (or any capable coding LLM) that has access to your project files. Each prompt is self-contained — paste the whole block. Always attach `claude.md` and `architecture.md` to your AI session before starting.

---

## Prerequisites

Before any prompt, tell your AI:

> "You are a senior TypeScript engineer helping me build a Next.js 14 App Router application. Always read CLAUDE.md before writing any code. Never use `any`. Use Zod for all validation. The concurrency-critical path is the `$executeRaw` UPDATE — never refactor it to ORM calls."

---

## PHASE 1: Project Scaffold & Configuration

### Prompt 1.1 — Initialize Project

```
Scaffold a new Next.js 14 App Router project called "allo" with:
- TypeScript (strict mode, no implicit any)
- Tailwind CSS
- ESLint
- App Router (not pages)
- src/ directory: NO

Then install these dependencies:
- @prisma/client prisma
- @upstash/redis
- zod
- @radix-ui/react-alert-dialog (for shadcn/ui)

Then install these dev dependencies:
- @types/node

Create a .env.example file with these keys (empty values):
DATABASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=

Create a .gitignore that includes .env.local

Show me the package.json and confirm the directory structure matches what's in CLAUDE.md.
```

---

### Prompt 1.2 — shadcn/ui Setup

```
Initialize shadcn/ui in this Next.js project. Use the "default" style and "slate" base color.
Then install these shadcn components:
- button
- card
- badge
- alert
- separator
- skeleton

Don't modify any existing files other than what shadcn/ui requires.
Show me the updated components.json and confirm tailwind.config.ts has the right content path.
```

---

### Prompt 1.3 — Prisma Schema

```
Create the Prisma schema at prisma/schema.prisma using the exact data model from architecture.md Section 3.

Requirements:
- datasource db: provider = "postgresql", url = env("DATABASE_URL")
- generator client: provider = "prisma-client-js"
- All models exactly as specified
- The @@unique([productId, warehouseId]) constraint on InventoryItem is critical — include it
- Use @id @default(uuid()) on all models
- Include the ReservationStatus enum

After creating the schema, create lib/db.ts as a Prisma client singleton:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma || new PrismaClient({ log: ['query'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

Then run: npx prisma generate
Show me the schema and lib/db.ts.
```

---

### Prompt 1.4 — Zod Schemas

```
Create lib/schemas.ts with Zod schemas for the entire API surface.

Include:
1. CreateReservationSchema — validates POST /api/reservations body
   { productId: uuid string, warehouseId: uuid string, quantity: positive integer }

2. ReservationResponseSchema — full reservation response shape including
   nested product (id, name, price) and warehouse (id, name, location)

3. ProductWithStockSchema — product with an array of inventory items,
   each containing warehouseId, warehouseName, totalUnits, reservedUnits, availableUnits

4. ErrorResponseSchema — { error: string, message: string }

Export TypeScript types inferred from each schema using z.infer<>.
No any types. Use .strict() on object schemas.
```

---

## PHASE 2: Database Seed

### Prompt 2.1 — Seed File

```
Create prisma/seed.ts that seeds the database with realistic data for a multi-warehouse Indian retail brand.

Seed exactly:
- 3 warehouses: "Mumbai Central", "Delhi North", "Bangalore South" with realistic addresses
- 5 products: "Classic White T-Shirt" (₹799), "Leather Sneakers" (₹3499), "Canvas Backpack" (₹1999), "Wireless Headphones" (₹5999), "Minimalist Watch" (₹8999)
  — Each product needs a name, description (1 sentence), price (Decimal), imageUrl (use https://picsum.photos/seed/{productname}/400/400)
- InventoryItem for every product × warehouse combination (15 rows total)
  — Vary the totalUnits: some 0 (to demo out-of-stock), some 1 (to demo race condition), some 5-20
  — Specifically: Leather Sneakers at Mumbai Central should have totalUnits = 1, reservedUnits = 0 (for demo)
  — reservedUnits = 0 for all rows initially

The seed should be idempotent: run deleteMany in reverse dependency order first.

Add to package.json:
"prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }

Show me the complete seed file.
```

---

## PHASE 3: Core Business Logic

### Prompt 3.1 — Reservation Logic

```
Create lib/reservation.ts with the core reservation functions.
This file contains the concurrency-critical code — follow architecture.md Section 4 exactly.

Implement these exported async functions:

1. atomicReserveStock(productId, warehouseId, quantity): Promise<boolean>
   — Uses prisma.$executeRaw with the atomic UPDATE from architecture.md
   — Returns true if 1 row updated, false if 0 rows (insufficient stock)
   — DO NOT use ORM findFirst + update pattern

2. releaseReservationStock(reservationId: string): Promise<void>
   — In a Prisma transaction:
     a. Find reservation, confirm it's PENDING or CONFIRMED (throw if not found)
     b. $executeRaw to decrement reservedUnits by reservation.quantity
     c. Update reservation status to RELEASED

3. confirmReservation(reservationId: string): Promise<Reservation>
   — Check if reservation is PENDING and not expired (throw 410-style error if expired)
   — In a Prisma transaction:
     a. Update reservation status to CONFIRMED
     b. $executeRaw to decrement totalUnits AND reservedUnits by quantity
        (permanently removes from inventory)
   — Return the updated reservation

4. expireStaleReservations(): Promise<number>
   — Finds all PENDING reservations where expiresAt < now()
   — In a transaction:
     a. For each expired reservation, $executeRaw to decrement reservedUnits
     b. Bulk update status to EXPIRED
   — Returns count of expired reservations

Create custom error classes: InsufficientStockError, ReservationExpiredError, ReservationNotFoundError

Show me the complete file. No any types.
```

---

### Prompt 3.2 — Redis Client

```
Create lib/redis.ts for Upstash Redis.

Use @upstash/redis. Create a singleton client.
Export two utility functions:

1. getIdempotencyResult(key: string): Promise<{ body: unknown, status: number } | null>
   — Gets cached response for an idempotency key
   — Returns null if key doesn't exist

2. setIdempotencyResult(key: string, body: unknown, status: number): Promise<void>
   — Caches response with 24h TTL (86400 seconds)
   — Key pattern: `idempotency:{key}`

If UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN are not set,
export stub functions that log a warning and return null/void (graceful degradation).

Show me the complete file.
```

---

## PHASE 4: API Routes

### Prompt 4.1 — GET /api/products

```
Create app/api/products/route.ts

This is a GET handler that:
1. Calls expireStaleReservations() first (lazy cleanup)
2. Fetches all products with their inventory items and warehouse details
3. Calculates availableUnits = totalUnits - reservedUnits for each item
4. Returns array matching ProductWithStockSchema from lib/schemas.ts

Use NextResponse.json(). No auth required.
Type the return value. Handle errors with try/catch → 500.
Cache: add revalidate = 0 to ensure fresh data.

Show me the complete route file.
```

---

### Prompt 4.2 — GET /api/warehouses

```
Create app/api/warehouses/route.ts

Simple GET that returns all warehouses from the database.
Type the response. Handle errors.
```

---

### Prompt 4.3 — POST /api/reservations (most important)

```
Create app/api/reservations/route.ts

This is the most critical endpoint. Follow architecture.md Section 4 exactly.

The POST handler must:
1. Check for Idempotency-Key header
   — If present, call getIdempotencyResult(key) and return cached response immediately if found
2. Parse + validate request body with CreateReservationSchema (Zod)
   — Return 400 with validation errors if invalid
3. Check product and warehouse exist — return 404 if not found
4. Call atomicReserveStock(productId, warehouseId, quantity)
   — If returns false → return 409 { error: "INSUFFICIENT_STOCK", message: "Not enough stock available" }
5. Create the Reservation record in the DB:
   — expiresAt = new Date(Date.now() + 10 * 60 * 1000)
   — status = PENDING
   — Include idempotencyKey if header was present
6. Fetch the full reservation with product + warehouse joined
7. Cache result with setIdempotencyResult if key was present
8. Return 201 with the reservation matching ReservationResponseSchema

Error handling:
- InsufficientStockError → 409
- Zod errors → 400
- All other errors → 500

IMPORTANT: Wrap steps 4 and 5 in a Prisma transaction to ensure atomicity.
If step 5 fails after step 4 succeeded, the transaction rolls back and reservedUnits is NOT permanently incremented.

Show me the complete route with all error cases handled.
```

---

### Prompt 4.4 — Confirm and Release Routes

```
Create two route files:

1. app/api/reservations/[id]/confirm/route.ts
   — POST handler
   — Get reservation by ID, return 404 if not found
   — If reservation.expiresAt < now(), return 410 { error: "RESERVATION_EXPIRED" }
   — If reservation.status !== PENDING, return 409 { error: "INVALID_STATUS" }
   — Call confirmReservation(id) from lib/reservation.ts
   — Return 200 with updated reservation

2. app/api/reservations/[id]/release/route.ts
   — POST handler
   — Get reservation by ID, return 404 if not found
   — If reservation.status not in [PENDING], return 409 { error: "INVALID_STATUS" }
   — Call releaseReservationStock(id) from lib/reservation.ts
   — Return 200 { success: true }

Both should handle errors cleanly and return typed responses.
```

---

### Prompt 4.5 — Cron Route

```
Create app/api/cron/expire-reservations/route.ts

GET handler (Vercel calls cron endpoints with GET):
1. Verify Authorization header: Bearer {process.env.CRON_SECRET}
   — Return 401 if missing or invalid
2. Call expireStaleReservations() from lib/reservation.ts
3. Return 200 { expired: count, timestamp: new Date().toISOString() }

Also create vercel.json at project root:
{
  "crons": [
    {
      "path": "/api/cron/expire-reservations",
      "schedule": "* * * * *"
    }
  ]
}

Show me both files.
```

---

## PHASE 5: Frontend

### Prompt 5.1 — Product Listing Page

```
Create the product listing page at app/page.tsx as a Server Component.

Requirements:
- Fetch from /api/products (absolute URL using NEXT_PUBLIC_APP_URL or relative for RSC)
- Display a responsive grid of ProductCard components (2 cols mobile, 3 cols desktop)
- Each card shows: product image, name, description, price in ₹ format
- Below the product info, show stock per warehouse as a list:
  [Warehouse Name] [Available: N] [Reserve button]
  — Button disabled and labeled "Out of Stock" if availableUnits === 0
  — Button labeled "Reserve" if stock available
- Clicking Reserve calls POST /api/reservations and navigates to /reservations/[id]
- Show a loading state while the page is fetching

Create app/components/ProductCard.tsx as a Client Component (needs onClick handler).

The Reserve button should:
- Show a spinner while the API call is in progress
- If 409, show an inline error alert: "Sorry, this item just sold out"
- If success, use router.push to navigate to /reservations/[id]

Style with Tailwind + shadcn/ui Card, Button, Badge.
Show me both files.
```

---

### Prompt 5.2 — Reservation Detail Page

```
Create the reservation checkout page at app/reservations/[id]/page.tsx as a Client Component.

It receives params.id. On mount, it fetches GET /api/reservations/[id]
(you'll need to create this route too — see below).

The page must show:
1. Product name, warehouse, quantity, price
2. A live countdown timer that:
   - Shows MM:SS format
   - Updates every second using setInterval
   - Turns red and pulses (Tailwind animate-pulse) when < 60 seconds remain
   - Shows "Reservation Expired" with error styling when hits 0
   - Clears the interval on component unmount
3. "Confirm Purchase" button:
   - Calls POST /api/reservations/:id/confirm
   - On success: show "Purchase confirmed! 🎉" state, hide buttons
   - On 410: show "This reservation has expired" error alert
   - On error: show generic error
4. "Cancel Reservation" button:
   - Calls POST /api/reservations/:id/release
   - On success: show "Reservation cancelled" state, navigate back to / after 2s
5. All state transitions happen without page refresh

Also create app/api/reservations/[id]/route.ts:
- GET handler that fetches a reservation with product + warehouse joined
- Returns 404 if not found

Create app/components/ReservationTimer.tsx as a separate component that accepts
expiresAt: string (ISO) and renders the countdown.

Style with Tailwind + shadcn/ui. Show me all files.
```

---

### Prompt 5.3 — Loading States & Error Boundaries

```
Add proper loading and error states to the app:

1. Create app/loading.tsx — skeleton loading state for the product listing
   Use shadcn/ui Skeleton component to show 6 card-shaped skeletons

2. Create app/error.tsx — error boundary for unexpected errors
   Show a friendly "Something went wrong" message with a "Try again" button
   that calls router.refresh()

3. Create app/not-found.tsx — 404 page
   Show "Page not found" with a link back to home

4. Add a Navbar in app/layout.tsx:
   - Show "allo." brand name on the left (bold)
   - No auth links needed
   - Clean minimal style

Show me all four files.
```

---

## PHASE 6: Polish & Deployment

### Prompt 6.1 — Concurrency Test

```
Create a test script at scripts/test-concurrency.ts that:

1. Reads the ID of a product that has exactly 1 unit in stock at a specific warehouse
   (hardcode from seed data or accept as CLI arg)
2. Fires 5 simultaneous POST /api/reservations requests for that unit
   using Promise.all with fetch
3. Logs each response: status code and body
4. Asserts that exactly 1 response is 201 and exactly 4 are 409

This is NOT a jest test — it's a manual integration test to run against the live or local server.
Usage: npx ts-node scripts/test-concurrency.ts http://localhost:3000

Show me the script.
```

---

### Prompt 6.2 — README

```
Write a complete README.md for this project.

Include these sections:
1. Overview — what the app does (2-3 sentences)
2. Live URL — placeholder for deployed URL
3. Tech Stack — table: Next.js 14, TypeScript, Prisma, Neon, Upstash Redis, Tailwind, Vercel
4. Local Development — step-by-step:
   a. Clone repo
   b. npm install
   c. Copy .env.example to .env.local and fill in values
   d. npx prisma migrate dev
   e. npx prisma db seed
   f. npm run dev
5. How Expiry Works — explain lazy cleanup + Vercel Cron approach (see architecture.md Section 5)
6. Concurrency Approach — explain the atomic UPDATE strategy (see architecture.md Section 4)
7. Idempotency (bonus) — explain Redis-based implementation
8. Trade-offs & What I'd Do Differently:
   - List at least 5 real trade-offs made for this exercise
   - List 3 things to improve with more time

Write in clear, direct prose. No fluff. Engineers will read this.
```

---

### Prompt 6.3 — Final Deployment Checklist

```
Help me do a final pre-deployment check.

1. Verify all environment variables are set in Vercel dashboard for these:
   DATABASE_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, CRON_SECRET, NEXT_PUBLIC_APP_URL

2. Run npx prisma migrate deploy (production migration)

3. Run npx prisma db seed against production DB (one time)

4. Confirm vercel.json has the cron job configuration

5. After deploying, run the concurrency test against the live URL:
   npx ts-node scripts/test-concurrency.ts https://your-app.vercel.app

6. Manually test the full flow:
   a. Load product listing — confirm products show with stock
   b. Click Reserve on a product with 1 unit
   c. Confirm the countdown starts at ~10 minutes
   d. Click Confirm Purchase — confirm success state
   e. Return to listing — confirm that product shows 0 available stock
   f. Try to reserve the same product — confirm 409 error is shown

List any issues found and how to fix them.
```

---

## Bonus Prompts

### Prompt B.1 — Idempotency End-to-End Test

```
Write a test in scripts/test-idempotency.ts that:

1. Generates a random idempotency key (UUID)
2. Sends POST /api/reservations with that key twice simultaneously (Promise.all)
3. Asserts BOTH responses have identical body and status
4. Asserts only 1 reservation was created in the DB (by checking GET /api/products stock)

Also write a second test that:
1. Sends POST /api/reservations with key K, gets a 201
2. Sends the SAME request again with key K for a different product/warehouse
3. Asserts the second response is identical to the first (not a new reservation)

Show me the complete script.
```

### Prompt B.2 — Pressure Meter UI (Out-of-the-Box Feature)

```
Add a "reservation pressure" indicator to the ProductCard component.

For each warehouse stock row, add a thin progress bar below the warehouse name that shows:
  reservedUnits / totalUnits as a percentage

Color coding:
- 0–30%: green (low demand)
- 31–70%: yellow (moderate demand)
- 71–100%: red (high demand / almost sold out)

If reservedUnits > 0, also show a small "🔥 N people checking out" label
where N = reservedUnits (simplified — in real life this would be approximate)

This makes the reservation system's behavior visible in the UI and creates authentic urgency
without being dark-pattern-ish (it's showing real data).

Use Tailwind for the bar. No external chart library needed.
Show me the updated ProductCard.tsx.
```
