import Shell from '@/components/layout/Shell'
import { prisma } from '@/lib/db'

async function getWarehouses() {
  const warehouses = await prisma.warehouse.findMany({
    include: {
      inventory: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  return warehouses.map((warehouse) => ({
    id: warehouse.id,
    name: warehouse.name,
    location: warehouse.location,
    skuCount: warehouse.inventory.length,
    totalUnits: warehouse.inventory.reduce((sum, item) => sum + item.totalUnits, 0),
    reservedUnits: warehouse.inventory.reduce((sum, item) => sum + item.reservedUnits, 0),
  }))
}

export default async function WarehousesPage() {
  const warehouses = await getWarehouses()

  return (
    <Shell>
      <div className="space-y-8 pb-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Warehouses</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Overview of stock distribution and capacity across warehouse locations.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">SKUs</th>
                  <th className="px-4 py-3">Total Units</th>
                  <th className="px-4 py-3">Reserved Units</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="px-4 py-4 font-medium text-zinc-900 dark:text-zinc-50">{warehouse.name}</td>
                    <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300">{warehouse.location}</td>
                    <td className="px-4 py-4 font-mono text-zinc-600 dark:text-zinc-300">{warehouse.skuCount}</td>
                    <td className="px-4 py-4 font-mono text-zinc-600 dark:text-zinc-300">{warehouse.totalUnits}</td>
                    <td className="px-4 py-4 font-mono text-zinc-600 dark:text-zinc-300">{warehouse.reservedUnits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  )
}