import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { 
  ArrowLeft, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  MapPin,
  Package2,
  Info
} from 'lucide-react'
import Link from 'next/link'

import Shell from '@/components/layout/Shell'
import { prisma } from '@/lib/db'
import { ImageViewer } from '@/components/ui/ImageViewer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ReserveButton } from './ReserveButton'

async function getProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      inventory: {
        include: {
          warehouse: true,
        },
      },
    },
  })

  if (!product) return null

  return {
    ...product,
    price: product.price.toString(),
  }
}

async function SkuDetails({ id }: { id: string }) {
  const product = await getProduct(id)

  if (!product) notFound()

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
      {/* Left Column: Media */}
      <div className="space-y-6">
        <Link 
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>
        
        <ImageViewer 
          src={product.imageUrl || '/placeholder-product.jpg'} 
          alt={product.name}
          className="aspect-square w-full"
        />

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <ShieldCheck className="h-5 w-5 text-emerald-500 mb-2" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Authentic</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <Truck className="h-5 w-5 text-blue-500 mb-2" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Fast Ship</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <RotateCcw className="h-5 w-5 text-amber-500 mb-2" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">30d Return</span>
          </div>
        </div>
      </div>

      {/* Right Column: Info & Actions */}
      <div className="flex flex-col pt-8 lg:pt-14">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-zinc-100 dark:bg-zinc-900 font-mono text-[10px]">
              SKU: {product.id.split('-')[0].toUpperCase()}
            </Badge>
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none">
              In Stock
            </Badge>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {product.name}
          </h1>
          
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            ${parseFloat(product.price).toFixed(2)}
          </p>

          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {product.description || "Premium inventory item managed via Allo ERP. This product is subject to real-time warehouse allocation and time-bounded reservations during checkout to ensure inventory integrity."}
          </p>
        </div>

        <Separator className="my-8" />

        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-zinc-400" />
            <h3 className="text-lg font-semibold">Warehouse Availability</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {product.inventory.map((inv) => {
              const available = inv.totalUnits - inv.reservedUnits
              const pressure = inv.totalUnits > 0 ? (inv.reservedUnits / inv.totalUnits) * 100 : 0
              
              return (
                <div 
                  key={inv.warehouseId}
                  className="group relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-zinc-50">{inv.warehouse.name}</span>
                        <span className="text-xs text-zinc-500 font-medium">{inv.warehouse.location}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-zinc-500">
                          <Package2 className="h-3 w-3" />
                          {inv.totalUnits} Total
                        </span>
                        <span className="flex items-center gap-1 text-rose-500">
                          <Info className="h-3 w-3" />
                          {inv.reservedUnits} Reserved
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
                        {available}
                      </div>
                      <div className="text-[10px] font-bold uppercase text-zinc-400">Available</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-1000"
                        style={{ width: `${(available / inv.totalUnits) * 100}%` }}
                      />
                    </div>
                    
                    <ReserveButton 
                      productId={product.id}
                      warehouseId={inv.warehouseId}
                      warehouseName={inv.warehouse.name}
                      disabled={available <= 0}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function SkuSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
      <div className="space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
      <div className="space-y-6 pt-14">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-px w-full" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export default function SkuPage({ params }: { params: { id: string } }) {
  return (
    <Shell>
      <Suspense fallback={<SkuSkeleton />}>
        <SkuDetails id={params.id} />
      </Suspense>
    </Shell>
  )
}
