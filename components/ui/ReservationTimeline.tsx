'use client'

import { motion } from 'framer-motion'
import { 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TimelineReservation {
  id: string
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED'
  createdAt: Date
  quantity: number
  productName: string
  warehouseName: string
}

export function ReservationTimeline({ reservations }: { reservations: TimelineReservation[] }) {
  const getStatusIcon = (status: TimelineReservation['status']) => {
    switch (status) {
      case 'PENDING':
        return <PlusCircle className="h-4 w-4 text-zinc-500" />
      case 'CONFIRMED':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case 'RELEASED':
        return <XCircle className="h-4 w-4 text-zinc-400" />
      case 'EXPIRED':
        return <Clock className="h-4 w-4 text-rose-500" />
    }
  }

  const getStatusColor = (status: TimelineReservation['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
      case 'CONFIRMED':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'RELEASED':
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500'
      case 'EXPIRED':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
    }
  }

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          <Badge variant="outline" className="font-mono text-[10px] border-zinc-200 dark:border-zinc-800">
            Live Feed
          </Badge>
        </div>
        <CardDescription>Live feed of inventory reservation lifecycle events</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="relative space-y-0">
          {reservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 px-6">
              <Clock className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">No recent activity found</p>
            </div>
          ) : (
            reservations.map((reservation, index) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                key={reservation.id}
                className={cn(
                  "group flex items-start gap-4 p-4 transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30",
                  index !== reservations.length - 1 && "border-b border-zinc-100 dark:border-zinc-900"
                )}
              >
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                  {getStatusIcon(reservation.status)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {reservation.productName}
                    </p>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {formatReservationTime(reservation.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>{reservation.quantity} Unit{reservation.quantity > 1 ? 's' : ''}</span>
                    <ArrowRight className="h-3 w-3 opacity-50" />
                    <span className="truncate">{reservation.warehouseName}</span>
                  </div>
                  <div className="pt-1">
                    <Badge className={cn("text-[9px] h-4.5 px-1.5 font-bold tracking-wider", getStatusColor(reservation.status))}>
                      {reservation.status}
                    </Badge>
                  </div>
                </div>
                <Link 
                  href={`/reservations/${reservation.id}`}
                  className="mt-1 text-zinc-400 opacity-0 transition-opacity hover:text-zinc-900 group-hover:opacity-100 dark:hover:text-zinc-100"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function formatReservationTime(date: string | Date) {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const hours = d.getHours()
  const minutes = d.getMinutes()
  const hh = hours % 12 === 0 ? 12 : hours % 12
  const hhStr = String(hh).padStart(2, '0')
  const mmStr = String(minutes).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  return `${hhStr}:${mmStr} ${ampm}`
}
