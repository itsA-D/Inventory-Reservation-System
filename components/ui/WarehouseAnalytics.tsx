'use client'

import * as React from 'react'

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ProductWithStock } from '@/lib/schemas'
import { cn } from '@/lib/utils'

export function WarehouseAnalytics({ products }: { products: ProductWithStock[] }) {
  // Aggregate data by warehouse
  const warehouseData = React.useMemo(() => {
    const warehouses: Record<string, { name: string, total: number, reserved: number }> = {}
    
    products.forEach(product => {
      product.inventory.forEach(inv => {
        if (!warehouses[inv.warehouseId]) {
          warehouses[inv.warehouseId] = {
            name: inv.warehouseName,
            total: 0,
            reserved: 0
          }
        }
        warehouses[inv.warehouseId].total += inv.totalUnits
        warehouses[inv.warehouseId].reserved += inv.reservedUnits
      })
    })

    return Object.entries(warehouses).map(([id, data]) => ({
      id,
      name: data.name,
      total: data.total,
      reserved: data.reserved,
      available: data.total - data.reserved,
      utilization: data.total > 0 ? (data.reserved / data.total) * 100 : 0
    }))
  }, [products])

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Warehouse Utilization</CardTitle>
        <CardDescription>Real-time stock pressure and capacity allocation</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={warehouseData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={{ fontSize: 12, fill: '#71717a' }}
                width={100}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                        <p className="mb-1 font-bold text-zinc-900 dark:text-zinc-50">{data.name}</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-500">Total Units:</span>
                            <span className="font-mono font-medium">{data.total}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-rose-500">
                            <span>Reserved:</span>
                            <span className="font-mono font-medium">{data.reserved}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-emerald-500">
                            <span>Available:</span>
                            <span className="font-mono font-medium">{data.available}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                            <span className="text-zinc-500">Utilization:</span>
                            <span className="font-mono font-bold">{data.utilization.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }}
              />
              <Bar dataKey="reserved" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} name="Reserved" />
              <Bar dataKey="available" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} name="Available" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouseData.map((data) => (
            <div key={data.id} className="rounded-lg border border-zinc-100 p-4 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{data.name}</span>
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                  data.utilization > 80 ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
                  data.utilization > 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                )}>
                  {data.utilization > 80 ? 'High Pressure' : data.utilization > 50 ? 'Moderate' : 'Stable'}
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 mb-2 overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000",
                    data.utilization > 80 ? "bg-rose-500" : data.utilization > 50 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${data.utilization}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                <span>{data.utilization.toFixed(0)}% Used</span>
                <span>{data.available} Units Left</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
