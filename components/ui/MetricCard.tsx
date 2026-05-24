'use client'

import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  icon: keyof typeof Icons
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  iconClassName?: string
}

export function MetricCard({
  title,
  value,
  icon,
  description,
  trend,
  className,
  iconClassName,
}: MetricCardProps) {
  const Icon = Icons[icon] as Icons.LucideIcon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn('overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm transition-all hover:shadow-md', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{value}</h2>
                {trend && (
                  <span className={cn(
                    'text-xs font-medium',
                    trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  )}>
                    {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
                  </span>
                )}
              </div>
              {description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-500 line-clamp-1">{description}</p>
              )}
            </div>
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900',
              iconClassName
            )}>
              {Icon && <Icon className="h-6 w-6 text-zinc-600 dark:text-zinc-300" />}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
