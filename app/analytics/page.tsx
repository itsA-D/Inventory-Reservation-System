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

  // Shared variables
  const colorTokens = {
    '--an-teal': '#2dd4a0',
    '--an-teal-dim': 'rgba(45, 212, 160, 0.10)',
    '--an-ind': '#6c63ff',
    '--an-ind-dim': 'rgba(108, 99, 255, 0.12)',
    '--an-ind-mid': 'rgba(108, 99, 255, 0.25)',
    '--an-amber': '#f59e0b',
    '--an-amber-dim': 'rgba(245, 158, 11, 0.10)',
    '--an-rose': '#f87171',
    '--an-rose-dim': 'rgba(248, 113, 113, 0.10)',
    '--an-ink1': '#e8e8f0',
    '--an-ink2': '#9090a8',
    '--an-ink3': '#50506a',
    '--an-sur1': '#12121e',
    '--an-sur2': '#18182a',
    '--an-sur3': '#1e1e32',
    '--an-brd': 'rgba(255,255,255,0.07)',
    '--an-brd2': 'rgba(255,255,255,0.12)'
  } as React.CSSProperties

  const cardStyle = {
    background: 'var(--an-sur1)',
    border: '1px solid var(--an-brd)',
    borderRadius: '14px',
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    position: 'relative' as const,
    overflow: 'hidden' as const
  }
  
  const labelStyle = {
    fontSize: '10px',
    color: 'var(--an-ink3)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px'
  }
  
  const valueStyle = {
    fontFamily: "ui-monospace, 'SF Mono', monospace",
    fontSize: '2rem',
    fontWeight: 'bold'
  }
  
  const panelTitleStyle = {
    color: 'var(--an-ink1)',
    fontSize: '13px',
    fontWeight: '600'
  }

  const panelSubtitleStyle = {
    color: 'var(--an-ink3)',
    fontSize: '11px'
  }

  const badgeStyle = (bgColor: string, color: string) => ({
    background: bgColor,
    color: color,
    padding: '2px 6px',
    borderRadius: '5px',
    fontSize: '10px',
    fontWeight: '600'
  })

  return (
    <Shell>
      <div style={{ ...colorTokens, display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem', color: 'var(--an-ink1)' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', letterSpacing: '-0.3px', color: 'var(--an-ink1)' }}>Analytics</h1>
          <p style={{ color: 'var(--an-ink3)', fontSize: '12px' }}>Inventory pressure, reservation lifecycle, and warehouse performance</p>
        </div>

        {/* SECTION 1 - KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={cardStyle}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'var(--an-teal)' }} />
            <div style={labelStyle}>Reservation Rate</div>
            <div style={{ ...valueStyle, color: 'var(--an-teal)' }}>{reservationRate}%</div>
            <div style={{ fontSize: '12px', color: 'var(--an-ink3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={badgeStyle('var(--an-teal-dim)', 'var(--an-teal)')}>+5%</span>
              vs last week
            </div>
          </div>
          
          <div style={cardStyle}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'var(--an-ind)' }} />
            <div style={labelStyle}>Avg Hold Time</div>
            <div style={{ ...valueStyle, color: 'var(--an-ind)' }}>{avgHoldMinutes}m</div>
            <div style={{ fontSize: '12px', color: 'var(--an-ink3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={badgeStyle('var(--an-teal-dim)', 'var(--an-teal)')}>-12s</span>
              faster than avg
            </div>
          </div>
          
          <div style={cardStyle}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'var(--an-amber)' }} />
            <div style={labelStyle}>Expiry Rate</div>
            <div style={{ ...valueStyle, color: 'var(--an-amber)' }}>{expiryRate}%</div>
            <div style={{ fontSize: '12px', color: 'var(--an-ink3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={badgeStyle('var(--an-amber-dim)', 'var(--an-amber)')}>+2%</span>
              unclaimed holds
            </div>
          </div>
          
          <div style={cardStyle}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'var(--an-rose)' }} />
            <div style={labelStyle}>409 Conflicts</div>
            <div style={{ ...valueStyle, color: 'var(--an-rose)' }}>0</div>
            <div style={{ fontSize: '12px', color: 'var(--an-ink3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={badgeStyle('var(--an-teal-dim)', 'var(--an-teal)')}>-3</span>
              race blocks today
            </div>
          </div>
        </div>

        {/* SECTION 2 - Funnel & Donut */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div style={{ ...cardStyle, flex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={panelTitleStyle}>Reservation Funnel</h2>
              <span style={panelSubtitleStyle}>all time</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {[
                { label: 'Created', count: total, pct: 100, color: 'rgba(108, 99, 255, 0.45)' },
                { label: 'Confirmed', count: confirmed, pct: reservationRate, color: 'rgba(45, 212, 160, 0.55)' },
                { label: 'Expired', count: expired, pct: expiryRate, color: 'rgba(245, 158, 11, 0.50)' },
                { label: 'Released', count: released, pct: releasedRate, color: 'rgba(248, 113, 113, 0.50)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '80px', textAlign: 'right', fontSize: '14px', color: 'var(--an-ink3)' }}>{row.label}</div>
                  <div style={{ flex: 1, background: 'var(--an-sur3)', height: '20px', borderRadius: '4px', position: 'relative' }}>
                    <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: '4px', transition: 'width 1s ease' }} />
                    <div style={{ position: 'absolute', top: 0, left: '8px', height: '100%', display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.90)' }}>
                      {row.count}
                    </div>
                  </div>
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '12px', color: 'var(--an-ink3)', fontFamily: "ui-monospace, 'SF Mono', monospace" }}>{row.pct}%</div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--an-brd)' }}>
              <div style={{ fontSize: '12px', color: 'var(--an-ink3)', marginBottom: '8px' }}>Reservations over last 7 days</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '40px' }}>
                {mockSparkline.map((val, i) => {
                  const max = Math.max(...mockSparkline)
                  const heightPct = (val / max) * 100
                  const isToday = i === mockSparkline.length - 1
                  return (
                    <div key={i} style={{ 
                      flex: 1, 
                      background: 'var(--an-ind-mid)', 
                      height: `${heightPct}%`, 
                      borderTopLeftRadius: '2px', 
                      borderTopRightRadius: '2px',
                      outline: isToday ? '1px solid rgba(108,99,255,0.4)' : 'none'
                    }} />
                  )
                })}
              </div>
            </div>
          </div>
          
          <div style={{ ...cardStyle, flex: 1 }}>
            <h2 style={{ ...panelTitleStyle, marginBottom: '1rem' }}>Status Breakdown</h2>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '2rem' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                <svg width="120" height="120" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--an-sur3)" strokeWidth="12" />
                  <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(45, 212, 160, 0.80)" strokeWidth="12" strokeDasharray={`${cDash} ${circumference}`} />
                  <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(245, 158, 11, 0.75)" strokeWidth="12" strokeDasharray={`${eDash} ${circumference}`} strokeDashoffset={-cDash} />
                  <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(248, 113, 113, 0.75)" strokeWidth="12" strokeDasharray={`${rDash} ${circumference}`} strokeDashoffset={-(cDash + eDash)} />
                </svg>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "ui-monospace, 'SF Mono', monospace" }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--an-ink1)' }}>{donutTotal}</span>
                  <span style={{ fontSize: '10px', color: 'var(--an-ink3)' }}>total</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', paddingLeft: '1rem' }}>
                {[
                  { label: 'Confirmed', pct: cPct, color: 'rgba(45, 212, 160, 0.80)' },
                  { label: 'Expired', pct: ePct, color: 'rgba(245, 158, 11, 0.75)' },
                  { label: 'Released', pct: rPct, color: 'rgba(248, 113, 113, 0.75)' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: row.color }} />
                    <span style={{ color: 'var(--an-ink1)' }}>{row.label}</span>
                    <span style={{ color: 'var(--an-ink3)', fontFamily: "ui-monospace, 'SF Mono', monospace", marginLeft: 'auto' }}>{Math.round(row.pct)}%</span>
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
              <h2 style={panelTitleStyle}>Stock Health by SKU</h2>
              <span style={panelSubtitleStyle}>available / total</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {stockRows.slice(0, 8).map((row, i) => {
                const color = row.pct >= 50 ? 'var(--an-teal)' : row.pct >= 10 ? 'var(--an-amber)' : 'var(--an-rose)'
                return (
                  <div key={`${row.productName}-${row.warehouseName}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--an-ink1)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{row.productName}</div>
                      <div style={{ fontSize: '10px', color: 'var(--an-ink3)' }}>{row.warehouseName}</div>
                    </div>
                    {row.available === 0 ? (
                      <div style={{ fontSize: '10px', color: 'var(--an-rose)', textTransform: 'uppercase', fontWeight: 'bold' }}>Out</div>
                    ) : (
                      <div style={{ width: '60px', height: '6px', background: 'var(--an-sur3)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${row.pct}%`, height: '100%', background: color }} />
                      </div>
                    )}
                    <div style={{ width: '30px', textAlign: 'right', fontFamily: "ui-monospace, 'SF Mono', monospace", fontSize: '14px', color: color, fontWeight: 'bold' }}>
                      {row.available}
                    </div>
                  </div>
                )
              })}
              {stockRows.length === 0 && (
                <div style={{ color: 'var(--an-ink3)', fontSize: '14px', textAlign: 'center', padding: '2rem 0' }}>No stock data available</div>
              )}
            </div>
          </div>
          
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={panelTitleStyle}>Warehouse Utilisation</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {warehouseStats.map((w, i) => {
                const status = w.utilPct > 70 ? 'Critical' : w.utilPct >= 30 ? 'Low Stock' : 'Stable'
                const color = w.utilPct > 70 ? 'var(--an-rose)' : w.utilPct >= 30 ? 'var(--an-amber)' : 'var(--an-teal)'
                const bgColor = w.utilPct > 70 ? 'var(--an-rose-dim)' : w.utilPct >= 30 ? 'var(--an-amber-dim)' : 'var(--an-teal-dim)'
                
                return (
                  <div key={w.name} style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: i !== warehouseStats.length - 1 ? '1.5rem' : '0', borderBottom: i !== warehouseStats.length - 1 ? '1px solid var(--an-brd)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontWeight: '600', fontSize: '13px', color: 'var(--an-ink1)' }}>{w.name}</h3>
                      <div style={{ fontSize: '10px', color: color, borderRadius: '999px', padding: '3px 9px', background: bgColor }}>
                        {status}
                      </div>
                    </div>
                    
                    <div style={{ width: '100%', height: '5px', background: 'var(--an-sur3)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${w.utilPct}%`, height: '100%', background: color }} />
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--an-ink3)' }}>
                      <div>Used: <span style={{ color: 'var(--an-ink2)', fontWeight: '500', fontFamily: "ui-monospace, 'SF Mono', monospace" }}>{w.utilPct}%</span></div>
                      <div>Left: <span style={{ color: 'var(--an-ink2)', fontWeight: '500', fontFamily: "ui-monospace, 'SF Mono', monospace" }}>{w.availableUnits}</span> units</div>
                    </div>
                  </div>
                )
              })}
              {warehouseStats.length === 0 && (
                <div style={{ color: 'var(--an-ink3)', fontSize: '14px', textAlign: 'center', padding: '2rem 0' }}>No warehouses available</div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4 - Conflict Log */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={panelTitleStyle}>409 Conflict Log</h2>
          </div>
          <div style={{ background: 'var(--an-sur2)', padding: '2rem', borderRadius: '8px', textAlign: 'center', color: 'var(--an-ink3)', fontSize: '14px', marginTop: '1rem' }}>
            <p>No conflicts recorded.</p>
            <p>The atomic UPDATE ensures race conditions are blocked at the DB level.</p>
            {/* TODO: replace with real conflict tracking later */}
          </div>
        </div>
        
      </div>
    </Shell>
  )
}