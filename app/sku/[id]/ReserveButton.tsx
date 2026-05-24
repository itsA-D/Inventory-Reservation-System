'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReserveButtonProps {
  productId: string
  warehouseId: string
  warehouseName: string
  disabled?: boolean
}

export function ReserveButton({ 
  productId, 
  warehouseId, 
  warehouseName,
  disabled 
}: ReserveButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  const handleReserve = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          productId,
          warehouseId,
          quantity: 1,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/reservations/${data.id}`)
      } else {
        setError(data.message || "An unexpected error occurred.")
        if (response.status === 409) {
          router.refresh() // Refresh to update stock UI
        }
      }
    } catch (error) {
      setError("Failed to connect to the server.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button 
        className="w-full h-12 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all font-bold group"
        disabled={disabled || isLoading}
        onClick={handleReserve}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ShoppingCart className="mr-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
        )}
        {disabled ? "Out of Stock" : "Reserve 1 Unit"}
      </Button>
      {error && (
        <p className="text-xs text-center font-medium text-rose-500">{error}</p>
      )}
    </div>
  )
}
