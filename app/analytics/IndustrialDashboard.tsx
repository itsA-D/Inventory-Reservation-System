'use client'

import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'

type Props = {
  products: any[]
  reservations: any[]
  warehouses: any[]
}

export default function IndustrialDashboard({ products, reservations, warehouses }: Props) {
  // Aggregate Data (computed from props)
  const totalReservations = reservations.length
  const confirmed = reservations.filter(r => r.status === 'CONFIRMED').length
  const expired = reservations.filter(r => r.status === 'EXPIRED').length
  const released = reservations.filter(r => r.status === 'RELEASED').length

  const confirmationRate = totalReservations ? Math.round((confirmed / totalReservations) * 100) : 0
  const expiryRate = totalReservations ? Math.round((expired / totalReservations) * 100) : 0
  const releasedRate = totalReservations ? Math.round((released / totalReservations) * 100) : 0

  // Inventory aggregates
  const allInventory = products.flatMap(p => p.inventory || [])
  const totalUnits = allInventory.reduce((s: number, i: any) => s + (i.totalUnits || 0), 0)
  const reservedUnits = allInventory.reduce((s: number, i: any) => s + (i.reservedUnits || 0), 0)
  const availableUnits = allInventory.reduce((s: number, i: any) => s + ((i.availableUnits != null) ? i.availableUnits : (i.totalUnits - (i.reservedUnits || 0))), 0)

  const availablePercent = totalUnits > 0 ? Math.round((availableUnits / totalUnits) * 100) : 0
  const reservedPercent = totalUnits > 0 ? Math.round((reservedUnits / totalUnits) * 100) : 0

  // Integrated grade: weighted availability (same as availablePercent)
  const integratedGrade = availablePercent

  const stockRows = products.flatMap(p =>
    p.inventory.map((i: any) => ({
      productName: p.name,
      warehouseName: i.warehouseName,
      total: i.totalUnits,
      available: i.availableUnits,
      reserved: i.reservedUnits,
      pct: i.totalUnits > 0 ? Math.round((i.availableUnits / i.totalUnits) * 100) : 0
    }))
  ).sort((a, b) => a.pct - b.pct)

  const warehouseStats = warehouses.map(w => {
    const items = products.flatMap(p => p.inventory.filter((i: any) => i.warehouseName === w.name))
    const totalUnits = items.reduce((s, i) => s + i.totalUnits, 0)
    const reservedUnits = items.reduce((s, i) => s + i.reservedUnits, 0)
    const utilPct = totalUnits > 0 ? Math.round((reservedUnits / totalUnits) * 100) : 0
    return { name: w.name, totalUnits, reservedUnits, availableUnits: totalUnits - reservedUnits, utilPct }
  })

  // Mock data for charts
  const trendData = [
    { name: 'Mon', active: 400, baseline: 240 },
    { name: 'Tue', active: 300, baseline: 139 },
    { name: 'Wed', active: 200, baseline: 980 },
    { name: 'Thu', active: 278, baseline: 390 },
    { name: 'Fri', active: 189, baseline: 480 },
    { name: 'Sat', active: 239, baseline: 380 },
    { name: 'Sun', active: 349, baseline: 430 },
  ]

  const radarData = [
    { subject: 'Availability', A: 120, fullMark: 150 },
    { subject: 'Speed', A: 98, fullMark: 150 },
    { subject: 'Expiry', A: 86, fullMark: 150 },
    { subject: 'Pressure', A: 99, fullMark: 150 },
    { subject: 'Throughput', A: 85, fullMark: 150 },
    { subject: 'Reliability', A: 65, fullMark: 150 },
  ]

  const cardStyle = {
    background: 'var(--bg-card)',
    borderRadius: '20px',
    border: '1px solid var(--border-card)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
  }

  const titleStyle = {
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontWeight: 400,
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: '16px'
  }

  const CircularGauge = ({ value, label, color, size = 100 }: { value: number, label: string, color: string, size?: number }) => {
    const strokeWidth = 4
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (value / 100) * circumference
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size/2} cy={size/2} r={radius} stroke="var(--bg-secondary)" strokeWidth={strokeWidth} fill="none" />
            <circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontSize: '20px', fontWeight: 700 }}>
            {value}%
          </div>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 400 }}>{label}</div>
      </div>
    )
  }

  return (
    <div className="industrial-theme" style={{ background: 'var(--bg-main)', minHeight: '100vh', padding: '32px', fontFamily: 'var(--font-inter)' }}>
      <div style={{ maxWidth: '1500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* ROW 1: Inventory Health Gauge & Trend Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
          <div className="glass-card" style={{ ...cardStyle, alignItems: 'center', justifyContent: 'center' }}>
            <div style={titleStyle}>Inventory Health</div>
            <CircularGauge value={integratedGrade} label="Integrated Grade" color="var(--accent-primary)" size={160} />
            <div style={{ display: 'flex', gap: '24px', marginTop: '24px', width: '100%', justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--accent-secondary)', fontSize: '12px', marginBottom: '4px' }}>Available</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{availablePercent}%</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--accent-secondary)', fontSize: '12px', marginBottom: '4px' }}>Reserved</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{reservedPercent}%</div>
              </div>
            </div>
          </div>
          
          <div className="glass-card" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={titleStyle}>Reservation Trend</div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '2px', background: 'var(--accent-primary)' }}/> Active</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '2px', background: 'var(--accent-secondary)' }}/> Baseline</div>
              </div>
            </div>
            <div style={{ height: '200px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="active" stroke="var(--accent-primary)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="baseline" stroke="var(--accent-secondary)" strokeWidth={1} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ROW 2: Warehouse Load Panel */}
        <div className="glass-card" style={cardStyle}>
          <div style={titleStyle}>Warehouse Load Panel</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {warehouseStats.map(w => (
              <div key={w.name} style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ width: '150px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>{w.name}</div>
                <div style={{ flex: 1, display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ flex: 1, height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${w.utilPct}%`, background: 'var(--accent-primary)' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', width: '140px', justifyContent: 'flex-end' }}>
                    <span style={{ color: 'var(--accent-primary)' }}>{w.reservedUnits}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>/</span>
                    <span style={{ color: 'var(--text-primary)' }}>{w.availableUnits}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROW 3: Inventory Table + Radar */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
          <div className="glass-card" style={cardStyle}>
            <div style={titleStyle}>Inventory Health Details</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', fontSize: '12px', borderBottom: '1px solid var(--border-card)' }}>
                    <th style={{ padding: '12px 0', fontWeight: 400 }}>Product Name</th>
                    <th style={{ padding: '12px 0', fontWeight: 400 }}>Warehouse</th>
                    <th style={{ padding: '12px 0', fontWeight: 400, textAlign: 'right' }}>Available</th>
                    <th style={{ padding: '12px 0', fontWeight: 400, textAlign: 'right' }}>Health</th>
                  </tr>
                </thead>
                <tbody>
                  {stockRows.slice(0, 6).map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-primary)', fontSize: '13px' }} className="hover:bg-white/5 transition-colors">
                      <td style={{ padding: '16px 0', fontWeight: 600 }}>{r.productName}</td>
                      <td style={{ padding: '16px 0', color: 'var(--text-secondary)' }}>{r.warehouseName}</td>
                      <td style={{ padding: '16px 0', textAlign: 'right', color: r.available === 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>{r.available === 0 ? 'OUT' : r.available}</td>
                      <td style={{ padding: '16px 0', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <div style={{ width: '40px', height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${r.pct}%`, background: r.pct >= 50 ? 'var(--color-success)' : r.pct >= 10 ? 'var(--color-warning)' : 'var(--color-danger)' }} />
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '30px' }}>{r.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card" style={cardStyle}>
            <div style={titleStyle}>Performance Radar</div>
            <div style={{ width: '100%', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="var(--border-card)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <Radar name="Warehouse" dataKey="A" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ROW 4: Reservation Analytics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px' }}>
            {[
            { label: 'Total Reservations', value: totalReservations, trend: '+12.6%', color: 'var(--accent-primary)' },
            { label: 'Confirmation Rate', value: `${confirmationRate}%`, trend: '+5.2%', color: 'var(--color-success)' },
            { label: 'Expiry Rate', value: `${expiryRate}%`, trend: '-1.4%', color: 'var(--color-warning)' },
            { label: 'Active Conflicts', value: '0', trend: '0.0%', color: 'var(--accent-secondary)' },
          ].map((stat, i) => (
            <div key={i} className="glass-card" style={cardStyle}>
              <div style={titleStyle}>{stat.label}</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '32px', fontWeight: 700, fontFamily: 'var(--font-inter)' }}>{stat.value}</div>
              <div style={{ color: stat.color, fontSize: '12px', marginTop: '12px', fontWeight: 600 }}>{stat.trend} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>vs last month</span></div>
            </div>
          ))}
        </div>

        {/* ROW 5: Product Insight Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
          {products.slice(0, 3).map((p, i) => (
            <div key={i} className="glass-card" style={{ ...cardStyle, borderLeft: `2px solid var(--accent-primary)` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{p.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>High volume SKU</div>
                </div>
                <div style={{ color: 'var(--accent-primary)', fontSize: '12px', fontWeight: 600 }}>Trending</div>
              </div>
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: 700 }}>
                  {p.inventory.reduce((sum: number, inv: any) => sum + inv.totalUnits, 0).toLocaleString()} <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>Units</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ROW 6: Circular Metrics */}
        <div className="glass-card" style={{ ...cardStyle, flexDirection: 'row', justifyContent: 'space-around', padding: '48px 24px' }}>
          <CircularGauge value={availablePercent} label="Available Stock %" color="var(--accent-primary)" size={120} />
          <CircularGauge value={reservedPercent} label="Reserved %" color="var(--accent-secondary)" size={120} />
          <CircularGauge value={expiryRate} label="Expired %" color="var(--color-warning)" size={120} />
          <CircularGauge value={releasedRate} label="Fulfilled %" color="var(--color-success)" size={120} />
        </div>

      </div>
    </div>
  )
}
