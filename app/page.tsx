import { Suspense } from 'react'

import ProductCard from '@/app/components/ProductCard'
import { ProductWithStock, ProductWithStockSchema } from '@/lib/schemas'

async function getProducts(): Promise<ProductWithStock[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  const endpoint = baseUrl ? `${baseUrl}/api/products` : 'http://localhost:3000/api/products'

  const response = await fetch(endpoint, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }

  const data = (await response.json()) as unknown
  return ProductWithStockSchema.array().parse(data)
}

async function ProductGrid() {
  const products = await getProducts()

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

function ProductsLoadingState() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-[340px] animate-pulse rounded-xl border bg-muted/40"
        />
      ))}
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="text-sm text-muted-foreground">
          Reserve inventory for 10 minutes during checkout.
        </p>
      </div>
      <Suspense fallback={<ProductsLoadingState />}>
        <ProductGrid />
      </Suspense>
    </main>
  )
}