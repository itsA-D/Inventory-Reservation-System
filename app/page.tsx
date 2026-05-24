import { Suspense } from 'react'
import { 
  Boxes, 
  Package, 
  Clock, 
  CheckCircle2, 
  Activity,
  ArrowUpRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react'

import Shell from '@/components/layout/Shell'
import { prisma } from '@/lib/db'
import { MetricCard } from '@/components/ui/MetricCard'
import { InventoryTable } from '@/components/ui/InventoryTable'
import { ReservationTimeline } from '@/components/ui/ReservationTimeline'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductWithStock } from '@/lib/schemas'

async function getDashboardData() {
  const [products, recentReservations, totalStats] = await Promise.all([
    prisma.product.findMany({
      include: {
        inventory: {
          include: {
            warehouse: true,
          },
        },
      },
    }),
    prisma.reservation.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        warehouse: true,
      },
    }),
    prisma.inventoryItem.aggregate({
      _sum: {
        totalUnits: true,
        reservedUnits: true,
      },
    }),
  ])

  // Process products for the table
  const productsWithStock: ProductWithStock[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price.toString(),
    imageUrl: p.imageUrl,
    inventory: p.inventory.map((inv) => ({
      warehouseId: inv.warehouseId,
      warehouseName: inv.warehouse.name,
      totalUnits: inv.totalUnits,
      reservedUnits: inv.reservedUnits,
      availableUnits: inv.totalUnits - inv.reservedUnits,
    })),
  }))

  // Process reservations for timeline
  const timelineReservations = recentReservations.map((r) => ({
    id: r.id,
    status: r.status as any,
    createdAt: r.createdAt,
    quantity: r.quantity,
    productName: r.product.name,
    warehouseName: r.warehouse.name,
  }))

  // Find expiring soon count (pending within next 2 minutes)
  const expiringSoonCount = await prisma.reservation.count({
    where: {
      status: 'PENDING',
      expiresAt: {
        gt: new Date(),
        lt: new Date(Date.now() + 2 * 60 * 1000),
      },
    },
  })

  return {
    productsWithStock,
    timelineReservations,
    metrics: {
      totalProducts: products.length,
      totalUnits: totalStats._sum.totalUnits || 0,
      reservedUnits: totalStats._sum.reservedUnits || 0,
      availableUnits: (totalStats._sum.totalUnits || 0) - (totalStats._sum.reservedUnits || 0),
      expiringSoon: expiringSoonCount,
    },
  }
}

async function DashboardContent() {
  // Debug: verify imported component references to catch undefined imports
  try {
    if (typeof MetricCard === 'undefined') console.error('MetricCard is undefined')
    if (typeof InventoryTable === 'undefined') console.error('InventoryTable is undefined')
    if (typeof ReservationTimeline === 'undefined') console.error('ReservationTimeline is undefined')
    if (typeof Skeleton === 'undefined') console.error('Skeleton is undefined')
  } catch (e) {
    console.error('Error checking component definitions', e)
  }

  const { productsWithStock, timelineReservations, metrics } = await getDashboardData()

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Operational overview of stock pressure, reservation flow, and warehouse health.
        </p>
      </div>

      {/* Hero Metrics Section */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Products"
          value={metrics.totalProducts}
          icon="Package"
          description="Unique SKUs across all warehouses"
          trend={{ value: 12, isPositive: true }}
          iconClassName="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        />
        <MetricCard
          title="Total Inventory"
          value={metrics.totalUnits}
          icon="Boxes"
          description="Total physical units in stock"
          trend={{ value: 4, isPositive: true }}
          iconClassName="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
        />
        <MetricCard
          title="Active Reservations"
          value={metrics.reservedUnits}
          icon="Clock"
          description="Stock temporarily held in checkout"
          trend={{ value: 8, isPositive: false }}
          iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <MetricCard
          title="Expiring Soon"
          value={metrics.expiringSoon}
          icon="AlertCircle"
          description="Reservations releasing in < 2min"
          className={metrics.expiringSoon > 0 ? "border-rose-200 bg-rose-50/20 dark:border-rose-900/30 dark:bg-rose-950/10" : ""}
          iconClassName={metrics.expiringSoon > 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Inventory Table - Takes 2/3 width */}
        <div className="lg:col-span-2 space-y-8" id="inventory-table-section">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Inventory Management</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage and monitor stock levels across all locations</p>
            </div>
          </div>
          <InventoryTable products={productsWithStock} />
          
        </div>

        {/* Sidebar Activity - Takes 1/3 width */}
        <div className="space-y-8" id="active-reservations-section">
          <ReservationTimeline reservations={timelineReservations} />
          
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 p-6 text-white shadow-lg overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-lg font-semibold mb-1">System Health</h3>
              <p className="text-zinc-400 text-xs mb-4">Real-time infrastructure status</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Prisma Client</span>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Redis Cache</span>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Cron Scheduler</span>
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <Activity className="h-3 w-3" />
                    <span>Idle</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="absolute -right-8 -bottom-8 opacity-10">
              <Activity className="h-32 w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-[500px] w-full rounded-2xl" />
          <Skeleton className="h-[300px] w-full rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[600px] w-full rounded-2xl" />
          <Skeleton className="h-[200px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Shell>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </Shell>
  )
}
