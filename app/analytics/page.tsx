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
  async function safeFetch<T>(url: string): Promise<{ ok: boolean; data?: T; error?: string }> {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        return { ok: false, error: `HTTP ${res.status} ${res.statusText} - ${text}` }
      }
      const data = (await res.json()) as T
      return { ok: true, data }
    } catch (err: any) {
      return { ok: false, error: String(err?.message ?? err) }
    }
  }

  const [prodRes, resRes, whRes] = await Promise.all([
    safeFetch<Product[]>(`${base}/api/products`),
    safeFetch<Reservation[]>(`${base}/api/reservations`),
    safeFetch<Warehouse[]>(`${base}/api/warehouses`),
  ])

  const products = prodRes.ok && prodRes.data ? prodRes.data : []
  const reservations = resRes.ok && resRes.data ? resRes.data : []
  const warehouses = whRes.ok && whRes.data ? whRes.data : []

  const errors: string[] = []
  if (!prodRes.ok) errors.push(`products: ${prodRes.error}`)
  if (!resRes.ok) errors.push(`reservations: ${resRes.error}`)
  if (!whRes.ok) errors.push(`warehouses: ${whRes.error}`)

  if (errors.length > 0) {
    // Log server-side for debugging
    // eslint-disable-next-line no-console
    console.error('Analytics data fetch errors:', errors)
  }

  return (
    <Shell>
      {errors.length > 0 ? (
        <div className="mx-auto mb-6 max-w-4xl rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[var(--bg-card)] p-6 text-center text-sm text-[var(--text-primary)]">
          <div className="font-semibold">Partial data load</div>
          <div className="text-[var(--text-secondary)] mt-2">Some analytics data could not be loaded. Check server logs or network connectivity.</div>
        </div>
      ) : null}
      <IndustrialDashboard 
        products={products} 
        reservations={reservations} 
        warehouses={warehouses} 
      />
    </Shell>
  )
}