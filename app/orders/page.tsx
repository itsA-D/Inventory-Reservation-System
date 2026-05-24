import { ShoppingBag } from 'lucide-react'

import Shell from '@/components/layout/Shell'
import { prisma } from '@/lib/db'
import { ReservationListItem, ReservationListItemSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

async function getOrders(): Promise<ReservationListItem[]> {
  const reservations = await prisma.reservation.findMany({
    where: { status: 'CONFIRMED' },
    include: {
      product: {
        select: { id: true, name: true, price: true },
      },
      warehouse: {
        select: { id: true, name: true, location: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const payload = reservations.map((r) => ({
    id: r.id,
    status: r.status,
    quantity: r.quantity,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    product: { id: r.product.id, name: r.product.name, price: r.product.price.toString() },
    warehouse: { id: r.warehouse.id, name: r.warehouse.name, location: r.warehouse.location },
  })) as unknown

  return ReservationListItemSchema.array().parse(payload)
}

function formatCurrency(value: string | number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default async function OrdersPage() {
  const orders = await getOrders()

  return (
    <Shell>
      <div className="space-y-8 pb-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            All confirmed purchases across your warehouses.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <ShoppingBag className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">No confirmed orders yet</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Confirmed reservations will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Total Price</th>
                    <th className="px-4 py-3">Confirmed At</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                      <td className="px-4 py-4 font-mono text-xs text-zinc-500 dark:text-zinc-400">{order.id}</td>
                      <td className="px-4 py-4 font-medium text-zinc-900 dark:text-zinc-50">{order.product.name}</td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300">{order.warehouse.name}</td>
                      <td className="px-4 py-4 font-mono text-zinc-600 dark:text-zinc-300">{order.quantity}</td>
                      <td className="px-4 py-4 font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                        {formatCurrency(Number(order.product.price) * order.quantity)}
                      </td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300">{formatDate(order.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}