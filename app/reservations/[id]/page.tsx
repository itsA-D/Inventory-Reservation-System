'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import ReservationTimer from '@/app/components/ReservationTimer'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ErrorResponse, ReservationResponse, ReservationResponseSchema } from '@/lib/schemas'

type ViewState = 'idle' | 'loading' | 'confirmed' | 'cancelled'

type Params = {
  id: string
}

function formatPrice(price: string | number): string {
  const parsed = Number(price)
  if (!Number.isFinite(parsed)) {
    return '₹0'
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(parsed)
}

export default function ReservationDetailPage() {
  const params = useParams<Params>()
  const router = useRouter()
  const reservationId = params.id

  const [reservation, setReservation] = useState<ReservationResponse | null>(null)
  const [viewState, setViewState] = useState<ViewState>('idle')
  const [isFetching, setIsFetching] = useState<boolean>(true)
  const [isConfirming, setIsConfirming] = useState<boolean>(false)
  const [isCancelling, setIsCancelling] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const fetchReservation = async () => {
      try {
        setIsFetching(true)
        setErrorMessage(null)

        const response = await fetch(`/api/reservations/${reservationId}`, {
          signal: controller.signal,
          cache: 'no-store',
        })

        if (response.status === 404) {
          setErrorMessage('Reservation not found')
          return
        }

        if (!response.ok) {
          setErrorMessage('Failed to load reservation details')
          return
        }

        const body = (await response.json()) as unknown
        const parsed = ReservationResponseSchema.safeParse(body)

        if (!parsed.success) {
          setErrorMessage('Invalid reservation response')
          return
        }

        setReservation(parsed.data)
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setErrorMessage('Failed to load reservation details')
      } finally {
        setIsFetching(false)
      }
    }

    fetchReservation()

    return () => {
      controller.abort()
    }
  }, [reservationId])

  const handleConfirm = async () => {
    if (!reservation) {
      return
    }

    setIsConfirming(true)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: 'POST',
      })

      if (response.status === 410) {
        setErrorMessage('This reservation has expired')
        setReservation((current) =>
          current ? { ...current, status: 'EXPIRED' } : current
        )
        return
      }

      if (!response.ok) {
        setErrorMessage('Could not confirm purchase')
        return
      }

      const body = (await response.json()) as unknown
      const parsed = ReservationResponseSchema.safeParse(body)

      if (!parsed.success) {
        setErrorMessage('Could not confirm purchase')
        return
      }

      setReservation(parsed.data)
      setViewState('confirmed')
    } catch {
      setErrorMessage('Could not confirm purchase')
    } finally {
      setIsConfirming(false)
    }
  }

  const handleCancel = async () => {
    if (!reservation) {
      return
    }

    setIsCancelling(true)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: 'POST',
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ErrorResponse | null
        setErrorMessage(body?.message ?? 'Could not cancel reservation')
        return
      }

      setViewState('cancelled')
      window.setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch {
      setErrorMessage('Could not cancel reservation')
    } finally {
      setIsCancelling(false)
    }
  }

  const shouldHideActions =
    viewState === 'confirmed' ||
    viewState === 'cancelled' ||
    reservation?.status === 'EXPIRED'

  if (isFetching) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading reservation...</CardTitle>
            <CardDescription>Please wait while we fetch your reservation.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  if (!reservation) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Alert variant="destructive">
          <AlertTitle>Unable to load reservation</AlertTitle>
          <AlertDescription>{errorMessage ?? 'Something went wrong'}</AlertDescription>
        </Alert>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{reservation.product.name}</CardTitle>
            <Badge variant="secondary">{reservation.status}</Badge>
          </div>
          <CardDescription>
            {reservation.warehouse.name} · {reservation.warehouse.location}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>Action required</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {viewState === 'confirmed' ? (
            <Alert>
              <AlertTitle>Purchase confirmed! 🎉</AlertTitle>
              <AlertDescription>Your order has been successfully confirmed.</AlertDescription>
            </Alert>
          ) : null}

          {viewState === 'cancelled' ? (
            <Alert>
              <AlertTitle>Reservation cancelled</AlertTitle>
              <AlertDescription>Redirecting you back to products...</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 rounded-md border p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Quantity</p>
              <p className="text-sm font-medium">{reservation.quantity}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Price</p>
              <p className="text-sm font-medium">{formatPrice(reservation.product.price)}</p>
            </div>
          </div>

          <ReservationTimer expiresAt={reservation.expiresAt} />

          {!shouldHideActions ? (
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleConfirm} disabled={isConfirming || isCancelling}>
                {isConfirming ? 'Confirming...' : 'Confirm Purchase'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isConfirming || isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Reservation'}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
