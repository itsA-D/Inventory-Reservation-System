import Shell from '@/components/layout/Shell'
import React from 'react'
import IndustrialDashboard from './IndustrialDashboard'

export const dynamic = 'force-dynamic'

type Product = {
  id: string
  name: string
  inventory: {
    warehouseName: string
    totalUnits: number
    availableUnits: number
    reservedUnits: number
  }[]
}

type Reservation = {
  id: string
  status: string
  createdAt: string
  updatedAt: string
}

type Warehouse = {
  id: string
  name: string
}

export default async function AnalyticsPage() {
  // Use relative API paths so server-side rendering works regardless of NEXT_PUBLIC_APP_URL
  const base = process.env.NEXT_PUBLIC_APP_URL || ''
  const [products, reservations, warehouses] = await Promise.all([
    fetch(`${base}/api/products`, { cache: 'no-store' }).then(r => r.json() as Promise<Product[]>),
    fetch(`${base}/api/reservations`, { cache: 'no-store' }).then(r => r.json() as Promise<Reservation[]>),
    fetch(`${base}/api/warehouses`, { cache: 'no-store' }).then(r => r.json() as Promise<Warehouse[]>),
  ])

  return (
    <Shell>
      <IndustrialDashboard 
        products={products} 
        reservations={reservations} 
        warehouses={warehouses} 
      />
    </Shell>
  )
}