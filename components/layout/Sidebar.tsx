'use client'

import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  ShoppingBag,
  Clock,
  ChevronLeft,
  X,
  Shield,
  Package,
  Warehouse,
  ArrowRightLeft,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type SidebarProps = {
  isMobileOpen: boolean
  setIsMobileOpen: (open: boolean) => void
}

type NavBadge = 'orders' | 'reservations'

type NavItem = {
  name: string
  href: string
  icon: LucideIcon
  badge?: NavBadge
}

type NavSection = {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Main',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'My Orders', href: '/orders', icon: ShoppingBag, badge: 'orders' },
      { name: 'Reservations', href: '/reservations', icon: Clock, badge: 'reservations' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { name: 'Products', href: '/products', icon: Package },
      { name: 'Warehouses', href: '/warehouses', icon: Warehouse },
    ],
  },
  {
    label: 'Reports',
    items: [{ name: 'Analytics', href: '/analytics', icon: BarChart3 }],
  },
]

export default function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [ordersCount, setOrdersCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    let mounted = true

    async function fetchCounts() {
      try {
        const [ordersResponse, reservationsResponse] = await Promise.all([
          fetch('/api/orders/count', { cache: 'no-store' }),
          fetch('/api/reservations/pending-count', { cache: 'no-store' }),
        ])

        if (!mounted) {
          return
        }

        if (ordersResponse.ok) {
          const payload = (await ordersResponse.json()) as { count?: number }
          setOrdersCount(payload.count ?? 0)
        }

        if (reservationsResponse.ok) {
          const payload = (await reservationsResponse.json()) as { count?: number }
          setPendingCount(payload.count ?? 0)
        }
      } catch (err) {
        // Defensive: log the error so we can trace intermittent runtime failures
        // eslint-disable-next-line no-console
        console.error('Sidebar fetchCounts error', err)
        if (mounted) {
          setOrdersCount(0)
          setPendingCount(0)
        }
      }
    }

    fetchCounts()
    const interval = window.setInterval(fetchCounts, 30000)

    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [])

  const sections = useMemo(() => NAV_SECTIONS, [])

  const getBadgeCount = (badge?: 'orders' | 'reservations') => {
    if (badge === 'orders') return ordersCount
    if (badge === 'reservations') return pendingCount
    return 0
  }

  const getBadgeClassName = (badge?: 'orders' | 'reservations') => {
    if (badge === 'orders') {
      return 'border-0 bg-[var(--red-bg)] text-[var(--red)]'
    }

    if (badge === 'reservations') {
      return 'border-0 bg-[var(--amber-bg)] text-[var(--amber)]'
    }

    return ''
  }

  const handleLinkClick = () => {
    setIsMobileOpen(false)
  }

  const handleBrandClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isCollapsed) {
      event.preventDefault()
      setIsCollapsed(false)
    }
  }

  const SidebarContent = ({ isMobile = false }) => {
    const showFull = !isCollapsed || isMobile

    return (
      <div className="flex h-full flex-col border-r border-[rgba(255,255,255,0.04)] bg-[var(--bg1)] text-[var(--text1)] glass-sidebar">
        <div className="flex h-16 items-center border-b border-[rgba(255,255,255,0.04)] px-2">
          <Link
            href="/"
            onClick={handleBrandClick}
            className={cn(
              'flex h-11 items-center gap-2 rounded-xl font-semibold transition-colors duration-200 hover:bg-[var(--bg2)]',
              showFull ? 'w-full px-3 justify-start' : 'w-11 justify-center px-0'
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg2)] text-[var(--text1)]">
              <Shield className="h-4 w-4" />
            </div>
            {showFull && (
              <span className="text-sm font-bold tracking-wide">allo.erp</span>
            )}
          </Link>
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text1)]"
              onClick={() => setIsMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          ) : showFull ? (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto size-7 text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text1)]"
              onClick={() => setIsCollapsed(true)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        {showFull && (
          <div className="px-3 py-4">
            <div className="flex items-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.04)] bg-[var(--bg2)] p-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg3)] text-xs font-semibold text-[var(--text1)]">
                IN
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-[var(--text1)]">Main Warehouse</span>
                <span className="text-[10px] font-medium text-[var(--text3)]">Standard Org</span>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-2 px-2 py-3">
          {sections.map((section) => (
            <div key={section.label}>
              {showFull && (
                <div className="px-[10px] pb-1 pt-2 text-[9px] font-bold uppercase tracking-[1.5px] text-[var(--text3)]">
                  {section.label}
                </div>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                  const badgeCount = getBadgeCount(item.badge)
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={handleLinkClick}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-sm font-medium transition-[background-color,color,border-color] duration-200',
                        !showFull && 'justify-center gap-0 px-2',
                        isActive
                          ? 'border-[rgba(108,99,255,0.2)] bg-[var(--bg2)] text-[var(--brand2)]'
                          : 'border-transparent text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text1)]'
                      )}
                      style={{
                        backgroundColor: isActive ? 'var(--bg2)' : undefined,
                        color: isActive ? 'var(--brand2)' : undefined,
                      }}
                    >
                      {isActive && showFull ? (
                        <span className="absolute left-0 top-1/2 h-[55%] w-[3px] -translate-y-1/2 rounded-r-sm bg-[var(--brand)]" />
                      ) : null}
                      <span
                        className={cn(
                          'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                          isActive
                            ? 'bg-[rgba(108,99,255,0.14)]'
                            : 'group-hover:bg-[var(--bg2)]'
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                      </span>
                      {showFull && <span className="flex-1">{item.name}</span>}
                      {showFull && item.badge && badgeCount > 0 ? (
                        <Badge className={cn('border-0 font-mono text-[10px] font-bold', getBadgeClassName(item.badge))}>
                          {badgeCount}
                        </Badge>
                      ) : null}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Drawer (Overlay and Panel) */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 md:hidden"
            >
              <SidebarContent isMobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Persistent Sidebar */}
      <motion.div
        animate={{ width: isCollapsed ? 60 : 220 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden h-screen shrink-0 flex-col overflow-hidden md:flex"
        style={{ width: isCollapsed ? 60 : 220 }}
      >
        <SidebarContent />
      </motion.div>
    </>
  )
}
