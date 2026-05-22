# Architecture Document
## Allo Inventory Reservation System

---

## 1. High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js RSC)                    │
│  ┌──────────────────┐          ┌──────────────────────────────┐ │
│  │  /  (Product     │          │  /reservations/[id]          │ │
│  │   Listing)       │          │  (Checkout + Countdown)      │ │
│  └────────┬─────────┘          └──────────────┬───────────────┘ │
└───────────┼────────────────────────────────────┼────────────────┘
            │ fetch / SWR                         │ fetch / SWR
┌───────────▼────────────────────────────────────▼────────────────┐
│                     Next.js App Router (Vercel Edge)            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Route Handlers  /api/products  /api/reservations  etc  │    │
│  │                      (Node.js Runtime)                   │    │
│  └────────────────────────┬────────────────────────────────┘    │
└───────────────────────────┼─────────────────────────────────────┘
                            │ Prisma ORM
            ┌───────────────┴───────────────┐
            │                               │
  ┌─────────▼──────────┐         ┌─────────▼──────────┐
  │  Postgres (Neon /  │         │  Redis (Upstash)    │
  │  Supabase)         │         │  - Distributed lock │
  │  - Products        │         │  - Idempotency store│
  │  - Warehouses      │         └────────────────────┘
  │  - InventoryItems  │
  │  - Reservations    │
  └────────────────────┘
            │
  ┌─────────▼──────────┐
  │  Vercel Cron       │
  │  (every 60s)       │
  │  /api/cron/expire  │
  └────────────────────┘
```

---

## 2. Technology Choices & Rationale

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 App Router | Required; RSC for server-side data fetching |
| Language | TypeScript | End-to-end type safety; shared Zod schemas |
| ORM | Prisma | Type-safe queries; clean migration story |
| Database | Neon (Postgres) | Serverless-friendly, free tier, Prisma native |
| Cache / Lock | Upstash Redis | Serverless Redis with HTTP; free tier |
| Validation | Zod | Single schema for API validation + frontend forms |
| Styling | Tailwind + shadcn/ui | Fast, accessible, functional-looking |
| Deployment | Vercel | Native Next.js; cron jobs built-in |

---

## 3. Data Model (Prisma Schema)

```prisma
model Product {
  id          String   @id @default(uuid())
  name        String
  description String?
  price       Decimal  @db.Decimal(10, 2)
  imageUrl    String?
  createdAt   DateTime @default(now())

  inventory   InventoryItem[]
  reservations Reservation[]
}

model Warehouse {
  id       String  @id @default(uuid())
  name     String
  location String

  inventory    InventoryItem[]
  reservations Reservation[]
}

model InventoryItem {
  id            String    @id @default(uuid())
  product       Product   @relation(fields: [productId], references: [id])
  productId     String
  warehouse     Warehouse @relation(fields: [warehouseId], references: [id])
  warehouseId   String
  totalUnits    Int
  reservedUnits Int       @default(0)

  @@unique([productId, warehouseId])
}

model Reservation {
  id             String            @id @default(uuid())
  product        Product           @relation(fields: [productId], references: [id])
  productId      String
  warehouse      Warehouse         @relation(fields: [warehouseId], references: [id])
  warehouseId    String
  quantity       Int
  status         ReservationStatus @default(PENDING)
  expiresAt      DateTime
  idempotencyKey String?           @unique
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  RELEASED
  EXPIRED
}
```

---

## 4. The Core: Concurrency-Safe Reservation

This is the most important part. The reservation endpoint must guarantee that two simultaneous requests for the last unit result in exactly one success and one 409.

### Strategy: Optimistic UPDATE with Row Locking

We use a single atomic SQL statement via Prisma's `$executeRaw`:

```sql
-- Step 1: Atomically decrement reservedUnits only if enough stock exists
UPDATE "InventoryItem"
SET    "reservedUnits" = "reservedUnits" + $quantity
WHERE  "productId" = $productId
  AND  "warehouseId" = $warehouseId
  AND  ("totalUnits" - "reservedUnits") >= $quantity
RETURNING id, "totalUnits", "reservedUnits";
```

**Why this works:**
- Postgres evaluates the `WHERE` and the `SET` atomically within the same row lock
- The first concurrent request acquires the row lock, evaluates the condition as true (stock available), and increments `reservedUnits`
- The second concurrent request waits on the lock, re-evaluates the condition (stock now exhausted), finds `(total - reserved) < quantity`, and the `UPDATE` returns 0 rows
- 0 rows updated → we return a 409 without creating a reservation

**Why not `SELECT ... FOR UPDATE`?**

```sql
-- Less optimal – two round trips
BEGIN;
SELECT * FROM "InventoryItem" WHERE ... FOR UPDATE;  -- row lock acquired
-- check available stock in application code
UPDATE "InventoryItem" SET reservedUnits = ... WHERE ...;
COMMIT;
```

This also works but requires a transaction + two queries. The single `UPDATE` approach is simpler and equally correct.

### Full Reservation Flow

```typescript
// Pseudo-code for POST /api/reservations
async function createReservation(productId, warehouseId, quantity) {
  // 1. Atomic stock decrement
  const updated = await prisma.$executeRaw`
    UPDATE "InventoryItem"
    SET "reservedUnits" = "reservedUnits" + ${quantity}
    WHERE "productId" = ${productId}
      AND "warehouseId" = ${warehouseId}
      AND ("totalUnits" - "reservedUnits") >= ${quantity}
  `;

  // 2. If 0 rows updated → insufficient stock
  if (updated === 0) {
    return { error: 409, message: "Insufficient stock" };
  }

  // 3. Create the reservation record
  const reservation = await prisma.reservation.create({
    data: {
      productId,
      warehouseId,
      quantity,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // +10 min
    }
  });

  return { reservation };
}
```

---

## 5. Expiry Mechanism

### Three-layer defense:

**Layer 1 – Lazy cleanup on reads (GET /api/products)**
```typescript
// Before returning products, sweep expired reservations
await prisma.$executeRaw`
  UPDATE "InventoryItem" i
  SET "reservedUnits" = "reservedUnits" - (
    SELECT COALESCE(SUM(r.quantity), 0)
    FROM "Reservation" r
    WHERE r."productId" = i."productId"
      AND r."warehouseId" = i."warehouseId"
      AND r.status = 'PENDING'
      AND r."expiresAt" < NOW()
  )
  WHERE EXISTS (
    SELECT 1 FROM "Reservation" r
    WHERE r.status = 'PENDING' AND r."expiresAt" < NOW()
  );

  UPDATE "Reservation"
  SET status = 'EXPIRED'
  WHERE status = 'PENDING' AND "expiresAt" < NOW();
`;
```

**Layer 2 – Vercel Cron (every 60 seconds)**
```
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
Secured with `CRON_SECRET` env var checked in the handler.

**Layer 3 – Confirm endpoint check**
```typescript
// POST /api/reservations/:id/confirm
if (reservation.expiresAt < new Date()) {
  // Also run cleanup for this specific reservation
  return { error: 410, message: "Reservation expired" };
}
```

### Why not a background worker?
- Vercel's serverless runtime doesn't support long-running processes
- Cron + lazy cleanup covers the gap: stock is always accurate when someone looks at products, and the cron ensures orphaned reservations don't linger > 60s

---

## 6. Idempotency (Bonus)

When a client sends the same `Idempotency-Key` header on a retry, we return the cached original response without side effects.

### Implementation:

```typescript
// On POST /api/reservations
const idempotencyKey = req.headers.get('Idempotency-Key');

if (idempotencyKey) {
  // Check Redis cache first
  const cached = await redis.get(`idempotency:${idempotencyKey}`);
  if (cached) {
    return Response.json(JSON.parse(cached), { status: cached.statusCode });
  }
}

// ... run reservation logic ...

if (idempotencyKey) {
  // Cache result for 24 hours
  await redis.setex(
    `idempotency:${idempotencyKey}`,
    86400,
    JSON.stringify({ ...result, statusCode: 201 })
  );
}
```

**Key decisions:**
- Store in Redis (Upstash) with 24h TTL — matches typical payment retry windows
- Cache both success AND 409 responses (idempotent errors)
- Also store `idempotencyKey` on the `Reservation` row for auditability

---

## 7. Frontend Architecture

### Routing
```
app/
├── page.tsx                    → Product listing (RSC, fetches on server)
├── reservations/
│   └── [id]/
│       └── page.tsx            → Checkout detail (client component for countdown)
└── api/
    ├── products/route.ts
    ├── warehouses/route.ts
    ├── reservations/
    │   ├── route.ts             → POST (create)
    │   └── [id]/
    │       ├── confirm/route.ts
    │       └── release/route.ts
    └── cron/
        └── expire-reservations/route.ts
```

### State Management
- **Product listing:** Next.js RSC (server-fetched, no client state needed)
- **Reservation page:** Client component with:
  - `useState` for reservation status
  - `useEffect` + `setInterval` for countdown timer
  - `router.refresh()` after confirm/cancel to revalidate RSC cache

### Error Handling Pattern
```typescript
// Every API call wrapped in a typed result
type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

// UI renders error state explicitly
{result.ok === false && result.status === 409 && (
  <Alert variant="destructive">
    <AlertTitle>Out of Stock</AlertTitle>
    <AlertDescription>
      Sorry, this item is no longer available at this warehouse.
    </AlertDescription>
  </Alert>
)}
```

---

## 8. Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Redis (Upstash)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Cron security
CRON_SECRET="..."

# App
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

---

## 9. Out-of-the-Box Design Idea: "Pressure Meter" UX

Beyond the basic requirements, consider a **live inventory pressure indicator** on the product listing page:

- A small animated bar under each warehouse showing `reservedUnits / totalUnits`
- When someone else reserves the last unit while you're looking, the page re-fetches (via `router.refresh` on focus or polling every 30s) and the button changes to "Out of Stock"
- On the reservation page, if `expiresAt - now < 60s`, the countdown turns red and pulses — creating urgency without being annoying

This surfaces the reservation system's behavior directly in the UI, making the invisible infrastructure visible to the user. It also demonstrates the system working correctly under concurrency in the demo.

---

## 10. Trade-offs and Known Limitations

| Decision | Trade-off |
|----------|-----------|
| Atomic UPDATE (no explicit transaction) | Simpler, but if the reservation INSERT fails after the UPDATE, `reservedUnits` is inflated. Mitigation: wrap both in a Prisma transaction |
| Vercel Cron (1-min granularity) | Reservations can be "expired" up to 60s before they're cleaned up. Acceptable for a 10-minute window |
| No auth | Reservations are not scoped to a user; anyone with the ID can confirm/cancel. Fine for a demo |
| No optimistic UI | After reserve, we navigate to a new page with a server fetch. Slightly slower but simpler |
| Redis for idempotency only | We don't use Redis for distributed locks (the atomic UPDATE is sufficient). Redis is only needed for the bonus |
