import Shell from '@/components/layout/Shell'
import { prisma } from '@/lib/db'
import { ProductWithStock } from '@/lib/schemas'

import ProductCard from '../components/ProductCard'

async function getProducts(): Promise<ProductWithStock[]> {
  const products = await prisma.product.findMany({
    include: {
      inventory: {
        include: {
          warehouse: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price.toString(),
    imageUrl: product.imageUrl,
    inventory: product.inventory.map((item) => ({
      warehouseId: item.warehouseId,
      warehouseName: item.warehouse.name,
      totalUnits: item.totalUnits,
      reservedUnits: item.reservedUnits,
      availableUnits: item.totalUnits - item.reservedUnits,
    })),
  }))
}

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <Shell>
      <div className="space-y-8 pb-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Browse and reserve stock across all warehouses.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No products available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}