'use client'

import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'

type ReservationTimerProps = {
  expiresAt: string
}

function formatRemaining(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function ReservationTimer({ expiresAt }: ReservationTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const remaining = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
    return Math.max(0, remaining)
  })

  useEffect(() => {
    const interval = window.setInterval(() => {
      const remaining = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      setRemainingSeconds(Math.max(0, remaining))
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [expiresAt])

  const isExpired = remainingSeconds <= 0
  const isUrgent = remainingSeconds > 0 && remainingSeconds < 60

  const timerClassName = useMemo(() => {
    if (isExpired) {
      return 'bg-destructive/15 text-destructive border-destructive/30'
    }

    if (isUrgent) {
      return 'animate-pulse border-destructive/30 bg-destructive/10 text-destructive'
    }

    return 'bg-secondary text-secondary-foreground'
  }, [isExpired, isUrgent])

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Time remaining</p>
      <Badge className={timerClassName}>
        {isExpired ? 'Reservation Expired' : formatRemaining(remainingSeconds)}
      </Badge>
    </div>
  )
}
