'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  expiresAt: string | Date
  onExpire?: () => void
  className?: string
}

export function CountdownTimer({ expiresAt, onExpire, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = React.useState<number>(0)
  const [isExpired, setIsExpired] = React.useState(false)

  const calculateTimeLeft = React.useCallback(() => {
    const expiration = new Date(expiresAt).getTime()
    const now = new Date().getTime()
    const diff = Math.max(0, expiration - now)
    return Math.floor(diff / 1000)
  }, [expiresAt])

  React.useEffect(() => {
    const initial = calculateTimeLeft()
    setTimeLeft(initial)
    if (initial === 0) setIsExpired(true)

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)
      
      if (remaining === 0 && !isExpired) {
        setIsExpired(true)
        onExpire?.()
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [calculateTimeLeft, onExpire, isExpired])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const isUrgent = timeLeft < 60 && timeLeft > 0

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-2 p-6 rounded-2xl border bg-white dark:bg-zinc-950 shadow-sm", 
      isUrgent ? "border-rose-200 bg-rose-50/30 dark:border-rose-900/50 dark:bg-rose-950/20" : "border-zinc-200 dark:border-zinc-800",
      className
    )}>
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        <Clock className={cn("h-4 w-4", isUrgent && "text-rose-500")} />
        <span>Reservation Timer</span>
      </div>

      <div className="relative flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={timeLeft}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "text-5xl font-mono font-bold tracking-tighter tabular-nums",
              isUrgent ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-50",
              isExpired && "text-zinc-400 opacity-50"
            )}
          >
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </motion.div>
        </AnimatePresence>

        {isUrgent && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [1, 1.5, 1.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 rounded-full border-4 border-rose-500/20"
          />
        )}
      </div>

      {isUrgent && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400"
        >
          <AlertTriangle className="h-3 w-3" />
          <span>Expiring soon! Complete your purchase now.</span>
        </motion.div>
      )}

      {isExpired && (
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Reservation Expired
        </div>
      )}
    </div>
  )
}
