# allo. — Inventory Reservation System

> A race-condition-safe inventory reservation platform for multi-warehouse retail and D2C brands.
> Shoppers reserve stock at checkout for a 10-minute window — confirmed on payment, released on timeout.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma)](https://prisma.io)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com)

---

## Table of Contents

- [Live Demo](#live-demo)
- [What This Is](#what-this-is)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
# allo. — Inventory Reservation System

A race-condition–safe inventory reservation system for multi-warehouse retail. Customers can reserve stock for a 10-minute payment window; reservations are confirmed on payment or released on expiry.

Live demo: https://your-deployed-app.vercel.app (replace with real URL)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| ORM | Prisma 5 |
| Database | Neon / Postgres |
| Cache / Idempotency | Upstash Redis |
| Validation | Zod |
| Styling | Tailwind CSS + shadcn/ui |
| Deployment | Vercel (includes cron support) |

## Overview

- Product listing (server components) shows available stock per warehouse.
- `POST /api/reservations` atomically reserves stock (10-minute hold). Confirm and release endpoints finalize or cancel reservations.

## Live URL

Replace with your deployed URL:

https://your-deployed-app.vercel.app

## Local Development

1. Clone the repository

```bash
git clone <repo-url>
cd allo
```

2. Install dependencies

```bash
npm install
```

3. Copy environment template and set values

```bash
cp .env.example .env.local
# edit .env.local and fill DATABASE_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, CRON_SECRET, NEXT_PUBLIC_APP_URL
# DATABASE_URL must be a PostgreSQL connection string
```

4. Start local PostgreSQL

```bash
docker compose up -d
```

The default local connection string is `postgresql://postgres:postgres@localhost:5432/allo_health?schema=public`.

5. Run migrations

```bash
npx prisma migrate dev --name init
```

6. Seed the database

```bash
npx prisma db seed
```

The seed is create-only and safe to rerun. It creates missing baseline catalog rows and does not delete existing data.

7. Start the dev server

```bash
npm run dev
```

Open: http://localhost:3000

## How Expiry Works

Expiry is implemented with two complementary mechanisms:

- Lazy cleanup on reads: `GET /api/products` calls `expireStaleReservations()` before returning product data. This ensures product listing always reflects released stock.
- Periodic cron sweep: a Vercel cron (`/api/cron/expire-reservations`) runs every minute (vercel.json) and calls the same cleanup function to ensure expired reservations are released even when no read occurs. Per-minute Vercel cron scheduling requires a Pro plan or above.

Both call the shared `lib/reservation.ts` logic which atomically decrements `reservedUnits` and marks reservations `EXPIRED`.

## Concurrency Approach

To guarantee exactly-one success for competing reservations of the last unit we use a single atomic SQL update via Prisma's `$executeRaw`:

```sql
UPDATE "InventoryItem"
SET "reservedUnits" = "reservedUnits" + $quantity
WHERE "productId" = $productId
  AND "warehouseId" = $warehouseId
  AND ("totalUnits" - "reservedUnits") >= $quantity
```

This check-and-increment runs under the same row lock in Postgres. If the UPDATE affects 0 rows, the request loses the race and the API returns `409 Conflict`. The reservation creation is wrapped inside a Prisma transaction so the decrement and record creation are atomic.

## Idempotency (bonus)

Clients may retry `POST /api/reservations` with an `Idempotency-Key` header. The server:

1. Checks Upstash Redis for `idempotency:{key}`; if present, returns the cached response (body + status).
2. If not present, runs the reservation transaction and caches the resulting response with a 24-hour TTL.

Both success (201) and conflict (409) responses are cached so retries return the same outcome and do not cause duplicate reservations.

## Trade-offs & What I'd Do Differently

Trade-offs made for this exercise:

- Atomic UPDATE vs explicit DB locks: used single-row atomic `UPDATE` for simplicity and performance; requires careful SQL and transaction usage. Benefit: fewer round trips; cost: more careful raw SQL handling.
- Vercel cron (1-minute) vs background worker: cron is simple and serverless-friendly but expiry can be delayed up to 60s. Acceptable for a 10-minute window.
- No authentication: simplifies the sample app and keeps focus on concurrency; in production each reservation should be tied to a user.
- Redis only for idempotency: avoids distributed locking complexity since atomic DB UPDATE suffices; trade-off is fewer cross-instance coordination guarantees for other multi-step flows.
- Single-item reservations (no cart): simplifies modeling and concurrency; a multi-item cart would require transactional semantics across multiple inventory rows.

Improvements I'd implement with more time:

1. Add user accounts and tie reservations to authenticated users (audit + security).
2. Add end-to-end concurrency tests run in CI (spawn multiple parallel requests against a real DB) and rate-limiters for noisy clients.
3. Improve observability: add metrics (Prometheus/Grafana) for reservation rates, conflicts, and expiry sweeps.

## Useful Commands

```bash
# run dev server
npm run dev

# run migrations
npx prisma migrate dev

# seed database
npx prisma db seed

# run concurrency test (manual script)
npx ts-node scripts/test-concurrency.ts http://localhost:3000
```

## Where to look in the code

- API handlers: `app/api/reservations`, `app/api/products`, `app/api/cron`
- Core logic: `lib/reservation.ts`
- Idempotency helpers: `lib/redis.ts`
- Zod schemas: `lib/schemas.ts`

---

If you want, I can also add a short troubleshooting section (common errors when running migrations, connecting Upstash, or seeding) or a one-command Docker Compose dev environment. Which would you prefer next?

        "availableUnits": 1
      }
    ]
  }
]
```

---

### `GET /api/warehouses`

Returns all warehouses.

**Response `200`:**
```json
[
  { "id": "uuid", "name": "Mumbai Central", "location": "Mumbai, Maharashtra" }
]
```

---

### `POST /api/reservations`

Reserves stock for a product at a warehouse.

**Headers:**
```
Content-Type: application/json
Idempotency-Key: <uuid>   (optional)
```

**Request Body:**
```json
{
  "productId": "uuid",
  "warehouseId": "uuid",
  "quantity": 1
}
```

**Response `201` — Success:**
```json
{
  "id": "uuid",
  "status": "PENDING",
  "quantity": 1,
  "expiresAt": "2024-01-01T10:10:00.000Z",
  "product": { "id": "uuid", "name": "Leather Sneakers", "price": "3499.00" },
  "warehouse": { "id": "uuid", "name": "Mumbai Central", "location": "..." }
}
```

**Response `409` — Insufficient stock:**
```json
{ "error": "INSUFFICIENT_STOCK", "message": "Not enough stock available at this warehouse" }
```

**Response `400` — Validation error:**
```json
{ "error": "VALIDATION_ERROR", "issues": [...] }
```

---

### `POST /api/reservations/:id/confirm`

Confirms a reservation (simulates payment success). Permanently decrements stock.

**Response `200` — Success:**
```json
{ "id": "uuid", "status": "CONFIRMED", ... }
```

**Response `410` — Reservation expired:**
```json
{ "error": "RESERVATION_EXPIRED", "message": "This reservation has expired" }
```

**Response `409` — Invalid status:**
```json
{ "error": "INVALID_STATUS", "message": "Reservation is not in PENDING status" }
```

---

### `POST /api/reservations/:id/release`

Releases a reservation early. Returns stock to available pool.

**Response `200`:**
```json
{ "success": true }
```

---

### `GET /api/cron/expire-reservations`

Sweeps expired reservations. Called automatically by Vercel Cron every minute.

**Headers:**
```
Authorization: Bearer {CRON_SECRET}
```

**Response `200`:**
```json
{ "expired": 3, "timestamp": "2024-01-01T10:00:00.000Z" }
```

**Response `401` — Unauthorized (missing/invalid secret):**
```json
{ "error": "Unauthorized" }
```

---

## Running the Concurrency Test

This script fires 5 simultaneous reservation requests for the 1-unit SKU and asserts exactly 1 succeeds:

```bash
# Against local dev server
npx ts-node scripts/test-concurrency.ts http://localhost:3000

# Against production
npx ts-node scripts/test-concurrency.ts https://your-app.vercel.app
```

**Expected output:**
```
Firing 5 simultaneous reservation requests for Leather Sneakers @ Mumbai Central...

Request 1: 201 Created  ✓  reservation id: abc-123
Request 2: 409 Conflict ✓  INSUFFICIENT_STOCK
Request 3: 409 Conflict ✓  INSUFFICIENT_STOCK
Request 4: 409 Conflict ✓  INSUFFICIENT_STOCK
Request 5: 409 Conflict ✓  INSUFFICIENT_STOCK

Results: 1 success, 4 conflicts
✅ PASS — exactly 1 reservation created, race condition handled correctly
```

If you see more than one 201, the concurrency protection is broken.

---

## Deployment

### Deploy to Vercel

1. Push your code to a public GitHub repository

2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo

3. Add environment variables in Vercel dashboard under **Settings → Environment Variables**:
   ```
   DATABASE_URL
   UPSTASH_REDIS_REST_URL
   UPSTASH_REDIS_REST_TOKEN
   CRON_SECRET
   NEXT_PUBLIC_APP_URL    ← set this to your actual Vercel URL after first deploy
   ```

4. Deploy. After the first deploy, copy the production URL and update `NEXT_PUBLIC_APP_URL`.

5. Run production migration against the production PostgreSQL database:
   ```bash
   npx prisma migrate deploy
   ```

6. Seed the production database after the schema is live:
   ```bash
DATABASE_URL="your-production-url" npx prisma db seed
```

   The seed is non-destructive. Re-running it only creates any missing baseline catalog rows.

7. Verify the cron job is registered in Vercel dashboard under **Settings → Cron Jobs**. You should see `/api/cron/expire-reservations` running every minute.

8. If your project is on the Vercel Hobby plan, change the cron schedule before deploy. Hobby only supports daily cron jobs; per-minute scheduling requires Pro or above.

### Verifying the Deployment

After deploying, run through this checklist:

- [ ] Product listing loads with correct stock levels
- [ ] Clicking "Reserve" creates a reservation and redirects to checkout
- [ ] Countdown timer starts at ~10 minutes and counts down live
- [ ] "Confirm Purchase" succeeds and shows confirmed state
- [ ] Returning to listing shows decremented stock
- [ ] Reserving a 0-stock item shows the 409 error inline
- [ ] Concurrency test passes against production URL

---

## Trade-offs & What I'd Do Differently

### Trade-offs Made

**1. Atomic UPDATE instead of explicit SELECT FOR UPDATE**  
Simpler and equally correct. The downside is that debugging is slightly harder (you can't inspect the lock acquisition in logs). In production I'd add structured logging around the `$executeRaw` call.

**2. Vercel Cron (1-minute granularity) instead of a message queue**  
Good enough for a 10-minute window. The real cost is that a reservation can "expire" but still show as pending for up to 60 seconds. A proper queue (BullMQ, Inngest) would expire reservations exactly at `expiresAt` to the second.

**3. No auth / user scoping**  
Reservations are not tied to a user session. Anyone with the reservation ID can confirm or cancel it. In production, reservations would be scoped to a session token or authenticated user.

**4. No optimistic UI**  
After clicking Reserve, we wait for the API response before navigating. A cleaner UX would navigate immediately and handle errors on the checkout page, but that adds complexity for marginal gain in a demo.

**5. Lazy cleanup on `GET /api/products` only**  
If the app had other read paths (search, category pages), each would need the same lazy cleanup or would show stale `reservedUnits`. In production, expiry would be handled exclusively by the queue/cron, not tied to read paths.

### What I'd Do With More Time

**Multi-item cart reservations**  
Currently one reservation = one SKU. A real cart needs atomic reservation of multiple SKUs — either one transaction across all items or a saga pattern with compensating releases.

**Exact-second expiry with Inngest or BullMQ**  
Replace the cron with event-driven job scheduling. Schedule a job at reservation creation time with a delay of exactly `expiresAt - now`. Zero polling, exact expiry.

**Webhook on expiry**  
When a reservation expires, fire a webhook (or server-sent event) so the checkout page can react in real time instead of relying on the client-side countdown reaching zero.

**E2E tests with Playwright**  
The concurrency test script is a good start but it's not automated. A Playwright test that opens two browser tabs simultaneously and races to reserve the last unit would be a proper regression guard.

**Admin dashboard**  
Ops teams need visibility into current reservation state, stock levels, and expiry times. Right now everything is only visible through Prisma Studio or raw API calls.

---

## License

MIT — see [LICENSE](./LICENSE)

---

<div align="center">
  Built for the Allo Engineering take-home exercise.
</div>
