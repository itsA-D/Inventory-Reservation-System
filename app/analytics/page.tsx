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
  const [products, reservations, warehouses] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/products`).then(r => r.json() as Promise<Product[]>),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/reservations`).then(r => r.json() as Promise<Reservation[]>),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/warehouses`).then(r => r.json() as Promise<Warehouse[]>),
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