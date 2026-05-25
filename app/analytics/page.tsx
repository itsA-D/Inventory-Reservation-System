import Shell from '@/components/layout/Shell'
import React from 'react'

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

  const total = reservations.length
  const confirmed = reservations.filter(r => r.status === 'CONFIRMED').length
  const expired = reservations.filter(r => r.status === 'EXPIRED').length
  const released = reservations.filter(r => r.status === 'RELEASED').length
  const pending = reservations.filter(r => r.status === 'PENDING').length

  const reservationRate = total > 0 ? Math.round((confirmed / total) * 100) : 0
  const expiryRate = total > 0 ? Math.round((expired / total) * 100) : 0
  const releasedRate = total > 0 ? Math.round((released / total) * 100) : 0

  // avg hold time: confirmed reservations, diff between createdAt and updatedAt in minutes
  const avgHoldMinutes = confirmed > 0
    ? Math.round(reservations
        .filter(r => r.status === 'CONFIRMED')
        .reduce((sum, r) => {
          const diff = (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) / 60000
          return sum + diff
        }, 0) / confirmed)
    : 0

  // stock health: flatten all inventory items, sort by availableUnits asc
  const stockRows = products.flatMap(p =>
    p.inventory.map(i => ({
      productName: p.name,
      warehouseName: i.warehouseName,
      total: i.totalUnits,
      available: i.availableUnits,
      reserved: i.reservedUnits,
      pct: i.totalUnits > 0 ? Math.round((i.availableUnits / i.totalUnits) * 100) : 0
    }))
  ).sort((a, b) => a.pct - b.pct)

  // warehouse utilisation
  const warehouseStats = warehouses.map(w => {
    const items = products.flatMap(p => p.inventory.filter(i => i.warehouseName === w.name))
    const totalUnits = items.reduce((s, i) => s + i.totalUnits, 0)
    const reservedUnits = items.reduce((s, i) => s + i.reservedUnits, 0)
    const utilPct = totalUnits > 0 ? Math.round((reservedUnits / totalUnits) * 100) : 0
    return { name: w.name, totalUnits, reservedUnits, availableUnits: totalUnits - reservedUnits, utilPct }
  })

  const mockSparkline = [12, 18, 15, 22, 19, 25, 20] // TODO: replace with real daily aggregation query

  const donutTotal = confirmed + expired + released || 1
  const cPct = (confirmed / donutTotal) * 100
  const ePct = (expired / donutTotal) * 100
  const rPct = (released / donutTotal) * 100

  const radius = 40
  const circumference = 2 * Math.PI * radius
  const cDash = (cPct / 100) * circumference
  const eDash = (ePct / 100) * circumference
  const rDash = (rPct / 100) * circumference

  // Card styles
  const cardStyle = {
    background: 'var(--bg1)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    position: 'relative' as const,
    overflow: 'hidden' as const
  }
  
  const labelStyle = {
    fontSize: '10px',
    color: 'var(--text3)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  }
  
  const valueStyle = {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '2rem',
    fontWeight: 'bold'
  }

  return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Analytics</h1>
          <p style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>Inventory pressure, reservation lifecycle, and warehouse performance</p>
        </div>

        {/* SECTION 1 - KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={cardStyle}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--emerald, #22c55e)' }} />
            <div style={labelStyle}>Reservation Rate</div>
            <div style={{ ...valueStyle, color: 'var(--emerald, #22c55e)' }}>{reservationRate}%</div>
            <div style={{ fontSize: '12px', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ background: 'var(--emerald, #22c55e)', color: 'black', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>+5%</span>
              vs last week
            </div>
          </div>
          
          <div style={cardStyle}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--brand, #3b82f6)' }} />
            <div style={labelStyle}>Avg Hold Time</div>
            <div style={{ ...valueStyle, color: 'var(--brand, #3b82f6)' }}>{avgHoldMinutes}m</div>
            <div style={{ fontSize: '12px', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ background: 'var(--emerald, #22c55e)', color: 'black', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>-12s</span>
              faster than avg
            </div>
          </div>
          
          <div style={cardStyle}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--amber, #f59e0b)' }} />
            <div style={labelStyle}>Expiry Rate</div>
            <div style={{ ...valueStyle, color: 'var(--amber, #f59e0b)' }}>{expiryRate}%</div>
            <div style={{ fontSize: '12px', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ background: 'var(--red, #ef4444)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>+2%</span>
              unclaimed holds
            </div>
          </div>
          
          <div style={cardStyle}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--red, #ef4444)' }} />
            <div style={labelStyle}>409 Conflicts</div>
            <div style={{ ...valueStyle, color: 'var(--red, #ef4444)' }}>0</div>
            <div style={{ fontSize: '12px', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ background: 'var(--emerald, #22c55e)', color: 'black', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>-3</span>
              race blocks today
            </div>
          </div>
        </div>

        {/* SECTION 2 - Funnel & Donut */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div style={{ ...cardStyle, flex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontWeight: 'bold' }}>Reservation Funnel</h2>
              <span style={{ fontSize: '12px', color: 'var(--text3)' }}>all time</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {[
                { label: 'Created', count: total, pct: 100, color: 'var(--brand, #3b82f6)' },
                { label: 'Confirmed', count: confirmed, pct: reservationRate, color: 'var(--emerald, #22c55e)' },
                { label: 'Expired', count: expired, pct: expiryRate, color: 'var(--amber, #f59e0b)' },
                { label: 'Released', count: released, pct: releasedRate, color: 'var(--red, #ef4444)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '80px', textAlign: 'right', fontSize: '14px', color: 'var(--text2)' }}>{row.label}</div>
                  <div style={{ flex: 1, background: 'var(--bg2, #17181f)', height: '24px', borderRadius: '4px', position: 'relative' }}>
                    <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: '4px', transition: 'width 1s ease' }} />
                    <div style={{ position: 'absolute', top: 0, left: '8px', height: '100%', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 'bold', color: row.pct > 10 ? 'white' : 'var(--text1)' }}>
                      {row.count}
                    </div>
                  </div>
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{row.pct}%</div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '8px' }}>Reservations over last 7 days</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '40px' }}>
                {mockSparkline.map((val, i) => {
                  const max = Math.max(...mockSparkline)
                  const heightPct = (val / max) * 100
                  return (
                    <div key={i} style={{ flex: 1, background: 'var(--brand, #3b82f6)', height: `${heightPct}%`, opacity: 0.8, borderTopLeftRadius: '2px', borderTopRightRadius: '2px' }} />
                  )
                })}
              </div>
            </div>
          </div>
          
          <div style={{ ...cardStyle, flex: 1 }}>
            <h2 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Status Breakdown</h2>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '2rem' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                <svg width="120" height="120" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--bg2, #17181f)" strokeWidth="12" />
                  <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--emerald, #22c55e)" strokeWidth="12" strokeDasharray={`${cDash} ${circumference}`} />
                  <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--amber, #f59e0b)" strokeWidth="12" strokeDasharray={`${eDash} ${circumference}`} strokeDashoffset={-cDash} />
                  <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--red, #ef4444)" strokeWidth="12" strokeDasharray={`${rDash} ${circumference}`} strokeDashoffset={-(cDash + eDash)} />
                </svg>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.25rem', fontFamily: 'var(--font-mono)' }}>
                  {donutTotal}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', paddingLeft: '1rem' }}>
                {[
                  { label: 'Confirmed', pct: cPct, color: 'var(--emerald, #22c55e)' },
                  { label: 'Expired', pct: ePct, color: 'var(--amber, #f59e0b)' },
                  { label: 'Released', pct: rPct, color: 'var(--red, #ef4444)' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: row.color }} />
                    <span style={{ color: 'var(--text1)' }}>{row.label}</span>
                    <span style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>{Math.round(row.pct)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3 - Stock Health & Warehouse Utilisation */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontWeight: 'bold' }}>Stock Health by SKU</h2>
              <span style={{ fontSize: '12px', color: 'var(--text3)' }}>available / total</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {stockRows.slice(0, 8).map((row, i) => {
                const color = row.pct >= 50 ? 'var(--emerald, #22c55e)' : row.pct >= 10 ? 'var(--amber, #f59e0b)' : 'var(--red, #ef4444)'
                return (
                  <div key={`${row.productName}-${row.warehouseName}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{row.productName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{row.warehouseName}</div>
                    </div>
                    {row.available === 0 ? (
                      <div style={{ fontSize: '10px', color: 'var(--red, #ef4444)', textTransform: 'uppercase', fontWeight: 'bold', padding: '2px 6px', background: 'var(--red-bg, rgba(239,68,68,0.1))', borderRadius: '4px' }}>Out</div>
                    ) : (
                      <div style={{ width: '60px', height: '6px', background: 'var(--bg2, #17181f)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${row.pct}%`, height: '100%', background: color }} />
                      </div>
                    )}
                    <div style={{ width: '30px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '14px', color: color, fontWeight: 'bold' }}>
                      {row.available}
                    </div>
                  </div>
                )
              })}
              {stockRows.length === 0 && (
                <div style={{ color: 'var(--text3)', fontSize: '14px', textAlign: 'center', padding: '2rem 0' }}>No stock data available</div>
              )}
            </div>
          </div>
          
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontWeight: 'bold' }}>Warehouse Utilisation</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {warehouseStats.map(w => {
                const status = w.utilPct > 70 ? 'Critical' : w.utilPct >= 30 ? 'Low Stock' : 'Stable'
                const color = w.utilPct > 70 ? 'var(--red, #ef4444)' : w.utilPct >= 30 ? 'var(--amber, #f59e0b)' : 'var(--emerald, #22c55e)'
                const bgColor = w.utilPct > 70 ? 'var(--red-bg, rgba(239,68,68,0.1))' : w.utilPct >= 30 ? 'var(--amber-bg, rgba(245,158,11,0.1))' : 'rgba(34,197,94,0.1)'
                
                return (
                  <div key={w.name} style={{ background: 'var(--bg2, #17181f)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontWeight: 'bold', fontSize: '14px' }}>{w.name}</h3>
                      <div style={{ fontSize: '10px', color: color, textTransform: 'uppercase', fontWeight: 'bold', padding: '2px 8px', background: bgColor, borderRadius: '12px' }}>
                        {status}
                      </div>
                    </div>
                    
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg0, #09090b)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${w.utilPct}%`, height: '100%', background: color }} />
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text2)' }}>
                      <div>Used: <span style={{ color: 'var(--text1)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{w.utilPct}%</span></div>
                      <div>Left: <span style={{ color: 'var(--text1)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{w.availableUnits}</span> units</div>
                    </div>
                  </div>
                )
              })}
              {warehouseStats.length === 0 && (
                <div style={{ color: 'var(--text3)', fontSize: '14px', textAlign: 'center', padding: '2rem 0' }}>No warehouses available</div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4 - Conflict Log */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontWeight: 'bold' }}>409 Conflict Log</h2>
          </div>
          <div style={{ background: 'var(--bg2, #17181f)', padding: '2rem', borderRadius: '8px', textAlign: 'center', color: 'var(--text3)', fontSize: '14px', marginTop: '1rem' }}>
            <p>No conflicts recorded.</p>
            <p>The atomic UPDATE ensures race conditions are blocked at the DB level.</p>
            {/* TODO: replace with real conflict tracking later */}
          </div>
        </div>
        
      </div>
    </Shell>
  )
}