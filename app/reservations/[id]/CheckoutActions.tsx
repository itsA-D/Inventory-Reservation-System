'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CheckoutActionsProps {
  reservationId: string
  status: string
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const data = (await response.json()) as { message?: string }
      return data.message || fallback
    } catch {
      return fallback
    }
  }

  try {
    const text = await response.text()
    return text || fallback
  } catch {
    return fallback
  }
}

export function CheckoutActions({ reservationId, status }: CheckoutActionsProps) {
  const [isConfirming, setIsConfirming] = React.useState(false)
  const [isReleasing, setIsReleasing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  const handleConfirm = async () => {
    setIsConfirming(true)
    setError(null)
    try {
      const response = await fetch(`/api/reservations/${reservationId}/confirm`, {
        method: 'POST',
      })

      if (response.ok) {
        router.refresh()
      } else {
        setError(await getErrorMessage(response, 'Failed to confirm reservation.'))
      }
    } catch {
      setError('Network error occurred while confirming the purchase.')
    } finally {
      setIsConfirming(false)
    }
  }

  const handleRelease = async () => {
    setIsReleasing(true)
    setError(null)
    try {
      const response = await fetch(`/api/reservations/${reservationId}/release`, {
        method: 'POST',
      })

      if (response.ok) {
        router.push('/')
      } else {
        setError(await getErrorMessage(response, 'Failed to release reservation.'))
      }
    } catch {
      setError('Network error occurred while cancelling the reservation.')
    } finally {
      setIsReleasing(false)
    }
  }

  if (status !== 'PENDING') {
    return (
      <Button variant="outline" className="w-full" disabled>
        Order Processed ({status})
      </Button>
    )
  }

  return (
    <div className="space-y-3">
      <Button 
        type="button"
        className="w-full h-12 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-bold"
        onClick={handleConfirm}
        disabled={isConfirming || isReleasing}
      >
        {isConfirming ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        )}
        Confirm Purchase
      </Button>
      
      <Button 
        type="button"
        variant="ghost"
        className="w-full h-12 rounded-xl text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-medium transition-colors"
        onClick={handleRelease}
        disabled={isConfirming || isReleasing}
      >
        {isReleasing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <XCircle className="mr-2 h-4 w-4" />
        )}
        Cancel Reservation
      </Button>

      {error && (
        <p className="text-xs text-center font-medium text-rose-500 mt-2">{error}</p>
      )}
    </div>
  )
}
