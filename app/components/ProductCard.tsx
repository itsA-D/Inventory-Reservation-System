'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ProductWithStock } from '@/lib/schemas'

type ProductCardProps = {
  product: ProductWithStock
}

type ErrorResponse = {
  error?: string
  message?: string
}

function formatPrice(price: string | number): string {
  const value = Number(price)
  if (!Number.isFinite(value)) {
    return '$0.00'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function getPressureStyles(reservedUnits: number, totalUnits: number): {
  width: string
  barClassName: string
  badgeClassName: string
} {
  const pressure = totalUnits > 0 ? Math.round((reservedUnits / totalUnits) * 100) : 0

  if (pressure <= 30) {
    return {
      width: `${pressure}%`,
      barClassName: 'bg-emerald-500',
      badgeClassName: 'text-emerald-700 dark:text-emerald-400',
    }
  }

  if (pressure <= 70) {
    return {
      width: `${pressure}%`,
      barClassName: 'bg-amber-500',
      badgeClassName: 'text-amber-700 dark:text-amber-400',
    }
  }

  return {
    width: `${pressure}%`,
    barClassName: 'bg-rose-500',
    badgeClassName: 'text-rose-700 dark:text-rose-400',
  }
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter()
  const [loadingWarehouseId, setLoadingWarehouseId] = useState<string | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)

  const reserve = async (warehouseId: string, availableUnits: number) => {
    if (availableUnits <= 0) {
      return
    }

    setInlineError(null)
    setLoadingWarehouseId(warehouseId)

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          warehouseId,
          quantity: 1,
        }),
      })

      if (response.status === 409) {
        setInlineError('Sorry, this item just sold out')
        return
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ErrorResponse | null
        setInlineError(body?.message ?? 'Unable to reserve right now')
        return
      }

      const body = (await response.json()) as { id: string }
      router.push(`/reservations/${body.id}`)
    } catch {
      setInlineError('Unable to reserve right now')
    } finally {
      setLoadingWarehouseId(null)
    }
  }

  return (
    <Card className="h-full">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-48 w-full object-cover"
        />
      ) : null}

      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{product.name}</CardTitle>
          <Badge variant="secondary">{formatPrice(product.price)}</Badge>
        </div>
        <CardDescription>{product.description ?? 'No description available.'}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {inlineError ? (
          <Alert variant="destructive">
            <AlertDescription>{inlineError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          {product.inventory.map((item) => {
            const isOutOfStock = item.availableUnits === 0
            const isLoading = loadingWarehouseId === item.warehouseId
            const pressure = getPressureStyles(item.reservedUnits, item.totalUnits)

            return (
              <div key={item.warehouseId} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium">{item.warehouseName}</p>
                      <p className="text-xs text-muted-foreground">
                        Available: {item.availableUnits} of {item.totalUnits}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className={`h-full transition-all duration-500 ${pressure.barClassName}`}
                          style={{ width: pressure.width }}
                        />
                      </div>

                      {item.reservedUnits > 0 ? (
                        <p className={`text-[11px] font-medium ${pressure.badgeClassName}`}>
                          {'\u{1F525}'} {item.reservedUnits} people checking out
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    disabled={isOutOfStock || isLoading}
                    onClick={() => reserve(item.warehouseId, item.availableUnits)}
                  >
                    {isLoading ? (
                      <>
                        <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Reserving...
                      </>
                    ) : isOutOfStock ? (
                      'Out of Stock'
                    ) : (
                      'Reserve'
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
