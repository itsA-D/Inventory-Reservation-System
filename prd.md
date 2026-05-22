# Product Requirements Document
## Allo Inventory Reservation System

**Version:** 1.0  
**Status:** Approved for Development  
**Audience:** Engineering (Take-Home Exercise)

---

## 1. Problem Statement

Multi-warehouse retail and D2C brands face a classic distributed systems race condition at checkout:

- **Decrement on cart add** → inventory looks depleted; 80% cart abandonment tanks conversion
- **Decrement on payment** → two customers can pay for the same unit; ops nightmare

**The solution:** A time-bounded reservation that "soft-holds" inventory during the payment window (~10 minutes), then either confirms (payment success) or releases (failure/timeout) automatically.

---

## 2. Goals

| Goal | Metric |
|------|--------|
| Zero double-sells | Two simultaneous requests for the last unit → exactly one 409 |
| Accurate available stock | `available = total - reserved` is always consistent |
| Automatic expiry | Expired reservations release stock with no manual ops |
| Transparent UX | Users see errors (409, 410) and live countdown; no silent failures |

---

## 3. Personas

- **Shopper** – browses products, reserves stock, pays, or abandons
- **Ops / Admin** – needs accurate inventory views (future scope; not in v1)

---

## 4. User Stories

### 4.1 Browse & Reserve
```
As a shopper,
I want to see real-time available stock per warehouse,
So I know whether a product is actually available before I attempt to buy.
```

```
As a shopper,
I want to reserve a product for 10 minutes when I proceed to checkout,
So I have time to complete payment without someone else buying the same unit.
```

```
As a shopper who tries to reserve out-of-stock inventory,
I want to immediately see a "not enough stock" error (409),
So I can adjust my selection or look at another warehouse.
```

### 4.2 Checkout Flow
```
As a shopper in checkout,
I want to see a live countdown timer on my reservation,
So I know how much time I have to complete payment.
```

```
As a shopper whose reservation expires mid-checkout,
I want to immediately see a "reservation expired" error (410),
So I can re-attempt the reservation if stock is still available.
```

### 4.3 Confirm / Cancel
```
As a shopper who completes payment,
I want to confirm my reservation,
So the stock is permanently decremented and I'm guaranteed the item.
```

```
As a shopper who changes their mind,
I want to cancel/release my reservation,
So the inventory is returned and other shoppers can buy it.
```

---

## 5. Functional Requirements

### 5.1 Data Model

#### Products
- `id`, `name`, `description`, `price`, `imageUrl`

#### Warehouses
- `id`, `name`, `location`

#### InventoryItems (Stock per product per warehouse)
- `productId`, `warehouseId`, `totalUnits`, `reservedUnits`
- Derived: `availableUnits = totalUnits - reservedUnits`

#### Reservations
- `id`, `productId`, `warehouseId`, `quantity`, `status` (pending | confirmed | released | expired)
- `expiresAt` (createdAt + 10 minutes)
- `idempotencyKey` (optional, for bonus)

### 5.2 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List products with available stock per warehouse |
| GET | `/api/warehouses` | List warehouses |
| POST | `/api/reservations` | Create reservation (atomic, race-condition-safe) |
| POST | `/api/reservations/:id/confirm` | Confirm (returns 410 if expired) |
| POST | `/api/reservations/:id/release` | Early release |

**POST /api/reservations – Request Body:**
```json
{
  "productId": "uuid",
  "warehouseId": "uuid",
  "quantity": 1
}
```

**POST /api/reservations – Response (201):**
```json
{
  "id": "uuid",
  "status": "pending",
  "expiresAt": "2024-01-01T10:10:00Z",
  "quantity": 1,
  "product": { "name": "...", "price": 0 },
  "warehouse": { "name": "..." }
}
```

**Error Responses:**
- `409 Conflict` – insufficient available stock
- `410 Gone` – reservation expired (on confirm)
- `404 Not Found` – reservation not found

### 5.3 Concurrency Guarantee
Two simultaneous POST `/api/reservations` requests for the last unit of a SKU must result in exactly one success and one 409. This must hold even under horizontal scaling (no in-process locking).

**Mechanism:** Postgres row-level locking via `SELECT ... FOR UPDATE` or an atomic `UPDATE ... WHERE availableUnits >= quantity` with a check constraint. Redis distributed lock is an acceptable alternative.

### 5.4 Expiry Mechanism
Reservations not confirmed before `expiresAt` must release stock automatically.

**Chosen approach:** Lazy cleanup on read + Vercel Cron (every minute).  
- On every `GET /api/products`, expired reservations are swept and stock restored.  
- A cron job at `/api/cron/expire-reservations` runs every 60 seconds as a safety net.

### 5.5 Frontend Pages

#### `/` – Product Listing
- Grid of product cards
- Each card shows: image, name, price, available stock per warehouse
- "Reserve" button per warehouse (disabled if stock = 0)
- Stock updates in real-time or on page focus

#### `/reservations/[id]` – Checkout / Reservation Detail
- Product details + warehouse
- Live countdown timer (re-renders every second, red at < 60s)
- "Confirm Purchase" button
- "Cancel Reservation" button
- Clear inline error state for 409 / 410
- After confirm/cancel: UI reflects new state without manual refresh

---

## 6. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Concurrency safety | Zero double-sells under load |
| Latency | Reserve API P95 < 300ms |
| Availability | Hosted on Vercel + Supabase/Neon (free tier acceptable) |
| TypeScript | 100% – no `any` except explicit escape hatches |
| Error visibility | 409 and 410 always surfaced to user |

---

## 7. Out of Scope (v1)

- Auth / user accounts
- Multi-item cart reservations
- Payment gateway integration (simulated by "Confirm" button)
- Admin inventory management UI
- Webhook notifications on expiry

---

## 8. Success Criteria

1. Two simultaneous reservation requests for the last unit → exactly one 409
2. `GET /api/products` always returns `availableUnits` that accounts for live reservations
3. Expired reservations automatically release stock within 60 seconds
4. Live URL lets interviewer demo full flow end-to-end without any setup
