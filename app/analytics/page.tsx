import Shell from '@/components/layout/Shell'
import React from 'react'
import IndustrialDashboard from './IndustrialDashboard'

export const dynamic = 'force-dynamic'

type Product = {
  id: string
  name: string
  inventory: {
    warehouseName: string
    totalUnits: number
    availableUnits: number
    reservedUnits: number
  }[]
}

type Reservation = {
  id: string
  status: string
  createdAt: string
  updatedAt: string
}

type Warehouse = {
  id: string
  name: string
}

export default async function AnalyticsPage() {
  // Read directly from the database during SSR to avoid network/internal fetch issues
  const { prisma } = await import('@/lib/db')

  let products: Product[] = []
  let reservations: Reservation[] = []
  let warehouses: Warehouse[] = []
  const errors: string[] = []

  try {
    const [dbProducts, dbReservations, dbWarehouses] = await Promise.all([
      prisma.product.findMany({
        include: {
          inventory: {
            include: { warehouse: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.reservation.findMany({
        include: {
          product: { select: { id: true, name: true, price: true } },
          warehouse: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.warehouse.findMany({ orderBy: { name: 'asc' } }),
    ])

    products = dbProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      inventory: p.inventory.map((i: any) => ({
        warehouseName: i.warehouse?.name ?? i.warehouseName ?? '',
        totalUnits: i.totalUnits,
        availableUnits: i.availableUnits ?? (i.totalUnits - (i.reservedUnits ?? 0)),
        reservedUnits: i.reservedUnits,
      })),
    }))

    reservations = dbReservations.map((r: any) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt?.toISOString(),
      updatedAt: r.updatedAt?.toISOString(),
    }))

    warehouses = dbWarehouses.map((w: any) => ({ id: w.id, name: w.name }))
  } catch (err: any) {
    console.error('Analytics DB error:', err)
    errors.push(String(err?.message ?? err))
  }

  return (
    <Shell>
      {errors.length > 0 ? (
        <div className="mx-auto mb-6 max-w-4xl rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[var(--bg-card)] p-6 text-center text-sm text-[var(--text-primary)]">
          <div className="font-semibold">Partial data load</div>
          <div className="text-[var(--text-secondary)] mt-2">Some analytics data could not be loaded. Check server logs or database connectivity.</div>
        </div>
      ) : null}
      <IndustrialDashboard products={products} reservations={reservations} warehouses={warehouses} />
    </Shell>
  )
}