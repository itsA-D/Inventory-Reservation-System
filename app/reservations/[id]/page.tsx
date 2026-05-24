import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { 
  Package, 
  MapPin, 
  ArrowLeft, 
  CreditCard,
  AlertCircle,
  Clock,
  ShieldCheck
} from 'lucide-react'
import Link from 'next/link'

import Shell from '@/components/layout/Shell'
import { prisma } from '@/lib/db'
import { CountdownTimer } from '@/components/ui/CountdownTimer'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckoutActions } from './CheckoutActions'

async function getReservation(id: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: true,
      warehouse: true,
    },
  })

  if (!reservation) return null

  return {
    ...reservation,
    product: {
      ...reservation.product,
      price: reservation.product.price.toString(),
    },
  }
}

async function ReservationDetails({ id }: { id: string }) {
  const reservation = await getReservation(id)

  if (!reservation) notFound()

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Left 2/3: Order Details */}
      <div className="lg:col-span-2 space-y-6">
        <Link 
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Complete Reservation</h1>
          <Badge className={
            reservation.status === 'PENDING' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
            reservation.status === 'CONFIRMED' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
            "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
          }>
            {reservation.status}
          </Badge>
        </div>

        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
          <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Product Summary</CardTitle>
                <CardDescription className="text-xs">Review your reserved items</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-800">
                <Image 
                  src={reservation.product.imageUrl || '/placeholder-product.jpg'} 
                  alt={reservation.product.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-bold text-lg leading-tight">{reservation.product.name}</h3>
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{reservation.warehouse.name}, {reservation.warehouse.location}</span>
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <div className="text-xs">
                    <span className="text-zinc-400 uppercase font-bold tracking-wider">Quantity</span>
                    <p className="font-mono text-sm font-bold">{reservation.quantity} Unit</p>
                  </div>
                  <div className="text-xs">
                    <span className="text-zinc-400 uppercase font-bold tracking-wider">Price</span>
                    <p className="font-mono text-sm font-bold">${parseFloat(reservation.product.price).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-6 dark:border-blue-900/30 dark:bg-blue-950/10">
          <div className="flex gap-4">
            <CreditCard className="h-6 w-6 text-blue-500 shrink-0" />
            <div className="space-y-1">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">Secure Payment Simulation</h4>
              <p className="text-sm text-blue-800/70 dark:text-blue-200/50">
                In this demo, the &quot;Confirm Purchase&quot; button simulates a successful payment gateway response. 
                Upon confirmation, the reserved unit is permanently deducted from the warehouse inventory.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right 1/3: Checkout Sidebar */}
      <div className="space-y-6">
        {reservation.status === 'PENDING' ? (
          <CountdownTimer
            expiresAt={reservation.expiresAt}
            className="shadow-md"
          />
        ) : (
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-zinc-400" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Reservation finalized</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    The countdown is only shown while a reservation is pending.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Order Total</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Subtotal</span>
                <span className="font-medium">${parseFloat(reservation.product.price).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Tax</span>
                <span className="font-medium">$0.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Shipping</span>
                <span className="text-emerald-500 font-medium">FREE</span>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-baseline pt-2">
              <span className="text-base font-bold">Total</span>
              <span className="text-2xl font-black tabular-nums">${parseFloat(reservation.product.price).toFixed(2)}</span>
            </div>

            <div className="pt-4">
              <CheckoutActions 
                reservationId={reservation.id} 
                status={reservation.status} 
              />
            </div>

            <div className="flex items-center gap-2 justify-center pt-4 text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
              <ShieldCheck className="h-3 w-3" />
              <span>Encrypted Transaction</span>
            </div>
          </CardContent>
        </Card>

        {reservation.status === 'EXPIRED' && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-rose-100 bg-rose-50/50 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-xs font-medium">This reservation has expired. The stock has been released back to the warehouse.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ReservationSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-[200px] w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  )
}

export default function ReservationPage({ params }: { params: { id: string } }) {
  return (
    <Shell>
      <Suspense fallback={<ReservationSkeleton />}>
        <ReservationDetails id={params.id} />
      </Suspense>
    </Shell>
  )
}
