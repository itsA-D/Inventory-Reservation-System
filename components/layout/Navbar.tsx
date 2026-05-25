'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, Bell, Search, Database, Globe, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type NavbarProps = {
  onMenuClick: () => void
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const pathname = usePathname()

  // Generate simple breadcrumbs from path
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean)
    if (paths.length === 0) {
      return [{ label: 'Overview', href: '/' }]
    }
    return [
      { label: 'Overview', href: '/' },
      ...paths.map((p, idx) => {
        const href = '/' + paths.slice(0, idx + 1).join('/')
        const label = p.charAt(0).toUpperCase() + p.slice(1)
        return { label: label.replace(/%5B/g, '[').replace(/%5D/g, ']'), href }
      }),
    ]
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between px-4 glass-nav">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumbs */}
        <nav className="hidden sm:flex items-center space-x-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            return (
              <div key={crumb.href} className="flex items-center gap-1.5">
                {idx > 0 && <span className="text-zinc-300 dark:text-zinc-700">/</span>}
                {isLast ? (
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* Right Navbar Section */}
      <div className="flex items-center gap-3">
        {/* Database Status indicator */}
        <div className="hidden md:flex items-center gap-2">
          <Badge
            variant="outline"
            className="flex items-center gap-1 px-2.5 py-1 text-xs border-emerald-500/20 bg-emerald-500/5 text-emerald-600 font-medium"
          >
            <Database className="h-3 w-3 shrink-0" />
            <span>SQLite Active</span>
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-1 px-2.5 py-1 text-xs border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          >
            <Globe className="h-3 w-3 shrink-0 text-zinc-400" />
            <span>Port 3000</span>
          </Badge>
        </div>

        {/* Action icons */}
        <Button
          variant="ghost"
          size="icon"
          className="size-9 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 rounded-lg"
        >
          <Bell className="h-4.5 w-4.5" />
        </Button>

        {/* Profile Avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          JD
        </div>
      </div>
    </header>
  )
}
