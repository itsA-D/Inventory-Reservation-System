# CLAUDE.md
## Allo Inventory Reservation System — AI Context File

This file tells Claude (and any AI assistant) everything it needs to know about this codebase to contribute effectively without asking unnecessary questions.

---

## Project Purpose

A Next.js inventory reservation system for multi-warehouse retail. Shoppers can temporarily reserve stock during checkout (10-minute window). The core engineering challenge is concurrency safety: two simultaneous reservations for the last unit must result in exactly one success.

---

## Tech Stack (Exact Versions)

```json
{
  "next": "14.x (App Router)",
  "typescript": "5.x",
  "prisma": "5.x",
  "database": "Postgres via Neon (serverless)",
  "redis": "Upstash via @upstash/redis",
  "validation": "zod",
  "styling": "tailwindcss + shadcn/ui",
  "deployment": "Vercel"
}
```

---

## Project Structure

```
allo/
├── app/
│   ├── page.tsx                    ← Product listing (Server Component)
│   ├── reservations/
│   │   └── [id]/
│   │       └── page.tsx            ← Checkout detail (Client Component)
│   └── api/
│       ├── products/route.ts
│       ├── warehouses/route.ts
│       ├── reservations/
│       │   ├── route.ts            ← POST: create reservation
│       │   └── [id]/
│       │       ├── confirm/route.ts
│       │       └── release/route.ts
│       └── cron/
│           └── expire-reservations/route.ts
├── lib/
│   ├── db.ts                       ← Prisma client singleton
│   ├── redis.ts                    ← Upstash Redis client
│   ├── reservation.ts              ← Core reservation logic (reusable)
│   └── schemas.ts                  ← Zod schemas (shared API + frontend)
├── components/
│   ├── ProductCard.tsx
│   ├── ReservationTimer.tsx
│   └── ErrorAlert.tsx
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── .env.local                      ← Never commit
└── vercel.json                     ← Cron job config
```

---

## Key Conventions

### TypeScript
- No `any`. Use `unknown` + type guards if you must escape.
- All API responses typed via Zod schemas in `lib/schemas.ts`
- Server Actions are NOT used — all mutations go through API route handlers

### API Routes
- All routes export named functions: `GET`, `POST` etc.
- Always validate request body with Zod before touching the DB
- Return `NextResponse.json(data, { status: N })`
- HTTP status semantics:
  - `201` — reservation created
  - `409` — insufficient stock (not a server error — expected business logic)
  - `410` — reservation expired
  - `404` — resource not found
  - `400` — validation error (invalid body)
  - `500` — unexpected server error

### Database
- Use `prisma.$executeRaw` for the atomic stock decrement (critical — do not refactor to ORM method calls)
- Always use Prisma transactions when doing multiple writes that must succeed together
- Never read `availableUnits` in application code and then update separately — this creates a TOCTOU race condition

### Redis
- Only used for idempotency key caching
- Key pattern: `idempotency:{key}` with 24h TTL
- If Redis is unavailable, degrade gracefully (skip idempotency, don't 500)

### Frontend
- Product listing page is a Server Component — data fetched on the server, no client-side state
- Reservation detail page is a Client Component — needs `useEffect` for the countdown timer
- Never use `router.push` to navigate after confirm/cancel; use `router.refresh()` + local state update
- Error states must be visible — never catch an API error silently

---

## The Concurrency-Critical Code Path

**DO NOT CHANGE THIS WITHOUT UNDERSTANDING IT:**

```typescript
// lib/reservation.ts
export async function atomicReserveStock(
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<boolean> {
  const result = await prisma.$executeRaw`
    UPDATE "InventoryItem"
    SET "reservedUnits" = "reservedUnits" + ${quantity}
    WHERE "productId" = ${productId}
      AND "warehouseId" = ${warehouseId}
      AND ("totalUnits" - "reservedUnits") >= ${quantity}
  `;
  return result === 1; // true = success, false = 409
}
```

This is the heart of the system. The WHERE clause and the SET happen atomically within Postgres's row lock. This is what prevents double-selling.

**If you need to add a transaction around this**, wrap it like:
```typescript
await prisma.$transaction(async (tx) => {
  const updated = await tx.$executeRaw`...`;
  if (updated === 0) throw new InsufficientStockError();
  await tx.reservation.create({ ... });
});
```

---

## Environment Variables (Required)

```env
DATABASE_URL=""           # Neon/Supabase Postgres connection string
UPSTASH_REDIS_REST_URL="" # Upstash Redis URL
UPSTASH_REDIS_REST_TOKEN="" # Upstash Redis token
CRON_SECRET=""            # Random string to secure cron endpoint
NEXT_PUBLIC_APP_URL=""    # Full URL of deployed app
```

---

## Running Locally

```bash
# 1. Install deps
npm install

# 2. Set up .env.local (copy from .env.example)
cp .env.example .env.local
# Fill in DATABASE_URL, UPSTASH_*, CRON_SECRET

# 3. Run migrations
npx prisma migrate dev

# 4. Seed the database
npx prisma db seed

# 5. Start dev server
npm run dev
```

---

## Database Seed

The seed creates:
- 3 warehouses (Mumbai, Delhi, Bangalore)
- 5 products (T-Shirt, Sneakers, Backpack, Headphones, Watch)
- Inventory items for each product × warehouse combination with varying stock levels
- 1 sample pending reservation (to demo the countdown UI)

Run: `npx prisma db seed`

---

## Cron Job

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/expire-reservations",
      "schedule": "* * * * *"
    }
  ]
}
```

The cron endpoint is protected — it checks `Authorization: Bearer {CRON_SECRET}`.
Vercel automatically sends this header when triggering cron jobs if configured in the dashboard.

---

## Expiry Logic (Two Layers)

1. **Lazy cleanup** — `GET /api/products` runs `expireStaleReservations()` before returning data
2. **Cron sweep** — `/api/cron/expire-reservations` runs every 60 seconds

Both call the same `expireStaleReservations()` function in `lib/reservation.ts`.

---

## Common Mistakes to Avoid

1. **Never do `findFirst` then `update` for stock** — always use the atomic `$executeRaw` UPDATE
2. **Never trust `availableUnits` from a prior read** — always derive it from `totalUnits - reservedUnits` in the query
3. **Never silently catch 409/410 in the frontend** — always surface them to the user
4. **Never start the countdown timer on the server** — `expiresAt` comes from the DB; the timer is purely client-side
5. **Never forget to decrement `reservedUnits` on release/expire** — this is how stock returns to available

---

## Git Commit Convention

```
feat: description of new feature
fix: description of bug fix
refactor: non-breaking code improvement
chore: dependency updates, config changes
```

Commit as you go. The git history is reviewed. Don't squash everything into one commit at the end.
