import { Clock } from 'lucide-react'

import ReservationTimer from '../components/ReservationTimer'
import Shell from '@/components/layout/Shell'
import { prisma } from '@/lib/db'
import { ReservationListItem, ReservationListItemSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

async function getPendingReservations(): Promise<ReservationListItem[]> {
  const reservations = await prisma.reservation.findMany({
    where: { status: 'PENDING' },
    include: {
      product: { select: { id: true, name: true, price: true } },
      warehouse: { select: { id: true, name: true, location: true } },
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

export default async function ReservationsPage() {
  const reservations = await getPendingReservations()

  return (
    <Shell>
      <div className="space-y-8 pb-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Reservations</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Pending holds queue with live expiry timers.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {reservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <Clock className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">No active reservations</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">New holds will appear here while checkout is in progress.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Reservation ID</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Time Remaining</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation) => (
                    <tr key={reservation.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                      <td className="px-4 py-4 font-mono text-xs text-zinc-500 dark:text-zinc-400">{reservation.id}</td>
                      <td className="px-4 py-4 font-medium text-zinc-900 dark:text-zinc-50">{reservation.product.name}</td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300">{reservation.warehouse.name}</td>
                      <td className="px-4 py-4 font-mono text-zinc-600 dark:text-zinc-300">{reservation.quantity}</td>
                      <td className="px-4 py-4">
                        <ReservationTimer expiresAt={reservation.expiresAt} />
                      </td>
                      <td className="px-4 py-4 font-medium text-amber-500">{reservation.status}</td>
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