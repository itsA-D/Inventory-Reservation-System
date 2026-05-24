import Shell from '@/components/layout/Shell'
import { MetricCard } from '@/components/ui/MetricCard'
import { WarehouseAnalytics } from '@/components/ui/WarehouseAnalytics'
import { prisma } from '@/lib/db'
import { ProductWithStock } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

async function getAnalyticsData() {
  const [products, totalStats, expiringSoonCount] = await Promise.all([
    prisma.product.findMany({
      include: {
        inventory: {
          include: {
            warehouse: true,
          },
        },
      },
    }),
    prisma.inventoryItem.aggregate({
      _sum: {
        totalUnits: true,
        reservedUnits: true,
      },
    }),
    prisma.reservation.count({
      where: {
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
          lt: new Date(Date.now() + 2 * 60 * 1000),
        },
      },
    }),
  ])

  const productsWithStock: ProductWithStock[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price.toString(),
    imageUrl: product.imageUrl,
    inventory: product.inventory.map((inv) => ({
      warehouseId: inv.warehouseId,
      warehouseName: inv.warehouse.name,
      totalUnits: inv.totalUnits,
      reservedUnits: inv.reservedUnits,
      availableUnits: inv.totalUnits - inv.reservedUnits,
    })),
  }))

  return {
    productsWithStock,
    metrics: {
      totalProducts: products.length,
      totalUnits: totalStats._sum.totalUnits || 0,
      reservedUnits: totalStats._sum.reservedUnits || 0,
      availableUnits: (totalStats._sum.totalUnits || 0) - (totalStats._sum.reservedUnits || 0),
      expiringSoon: expiringSoonCount,
    },
  }
}

export default async function AnalyticsPage() {
  const { productsWithStock, metrics } = await getAnalyticsData()

  return (
    <Shell>
      <div className="space-y-8 pb-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Inventory pressure, capacity, and reservation trends across all warehouses.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total Products" value={metrics.totalProducts} icon="Package" description="Tracked SKUs across the network" />
          <MetricCard title="Total Inventory" value={metrics.totalUnits} icon="Boxes" description="Physical units in stock" />
          <MetricCard title="Reserved Units" value={metrics.reservedUnits} icon="Clock" description="Held during checkout" />
          <MetricCard title="Expiring Soon" value={metrics.expiringSoon} icon="AlertCircle" description="Reservations releasing in < 2min" />
        </div>

        <WarehouseAnalytics products={productsWithStock} />
      </div>
    </Shell>
  )
}