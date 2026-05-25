import Shell from '@/components/layout/Shell'
import { ReservationListItem, ReservationListItemSchema } from '@/lib/schemas'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

type AuditEventType = 'RESERVED' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED' | 'RESTOCK'

type AuditEvent = {
  id: string
  type: AuditEventType
  timestamp: string
  description: string
  product: string
  warehouse: string
}

function getEventMeta(type: AuditEventType) {
  switch (type) {
    case 'RESERVED':
      return { dot: 'bg-amber-400', label: 'RESERVED' }
    case 'CONFIRMED':
      return { dot: 'bg-emerald-400', label: 'CONFIRMED' }
    case 'RELEASED':
      return { dot: 'bg-rose-400', label: 'RELEASED' }
    case 'EXPIRED':
      return { dot: 'bg-rose-400', label: 'EXPIRED' }
    case 'RESTOCK':
      return { dot: 'bg-sky-400', label: 'RESTOCK' }
  }
}

function buildEvents(reservations: ReservationListItem[]): AuditEvent[] {
  const events: AuditEvent[] = []

  for (const reservation of reservations) {
    if (reservation.status === 'PENDING') {
      events.push({
        id: `${reservation.id}-reserved`,
        type: 'RESERVED',
        timestamp: reservation.createdAt,
        description: `${reservation.quantity} unit${reservation.quantity > 1 ? 's' : ''} reserved`,
        product: reservation.product.name,
        warehouse: reservation.warehouse.name,
      })
    }

    if (reservation.status === 'CONFIRMED') {
      events.push({
        id: `${reservation.id}-confirmed`,
        type: 'CONFIRMED',
        timestamp: reservation.updatedAt,
        description: `${reservation.quantity} unit${reservation.quantity > 1 ? 's' : ''} confirmed`,
        product: reservation.product.name,
        warehouse: reservation.warehouse.name,
      })
    }

    if (reservation.status === 'RELEASED') {
      events.push({
        id: `${reservation.id}-released`,
        type: 'RELEASED',
        timestamp: reservation.updatedAt,
        description: `${reservation.quantity} unit${reservation.quantity > 1 ? 's' : ''} released`,
        product: reservation.product.name,
        warehouse: reservation.warehouse.name,
      })

      events.push({
        id: `${reservation.id}-restock`,
        type: 'RESTOCK',
        timestamp: reservation.updatedAt,
        description: `${reservation.quantity} unit${reservation.quantity > 1 ? 's' : ''} restocked`,
        product: reservation.product.name,
        warehouse: reservation.warehouse.name,
      })
    }

    if (reservation.status === 'EXPIRED') {
      events.push({
        id: `${reservation.id}-expired`,
        type: 'EXPIRED',
        timestamp: reservation.updatedAt,
        description: `${reservation.quantity} unit${reservation.quantity > 1 ? 's' : ''} expired`,
        product: reservation.product.name,
        warehouse: reservation.warehouse.name,
      })
    }
  }

  return events.sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
}

async function getAuditEvents(): Promise<AuditEvent[]> {
  // Use direct Prisma query on the server to avoid extra HTTP requests and
  // potential runtime issues with relative fetch calls in server components.
  const rows = await prisma.reservation.findMany({
    include: {
      product: true,
      warehouse: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const reservations: ReservationListItem[] = rows.map((r) => ({
    id: r.id,
    status: r.status as ReservationListItem['status'],
    quantity: r.quantity,
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : r.updatedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    product: {
      id: r.product.id,
      name: r.product.name,
      price: r.product.price as unknown as number,
    },
    warehouse: {
      id: r.warehouse.id,
      name: r.warehouse.name,
      location: r.warehouse.location,
    },
  }))

  const parsed = ReservationListItemSchema.array().parse(reservations)
  return buildEvents(parsed)
}

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

export default async function AuditPage() {
  const events = await getAuditEvents()

  return (
    <Shell>
      <div className="space-y-8 pb-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Complete history of all inventory and reservation events.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Event Description</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Warehouse</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const meta = getEventMeta(event.type)

                  return (
                    <tr key={event.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                          <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400">
                            {meta.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300">{formatTimestamp(event.timestamp)}</td>
                      <td className="px-4 py-4 text-zinc-900 dark:text-zinc-50">{event.description}</td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300">{event.product}</td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300">{event.warehouse}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  )
}