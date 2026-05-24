'use client'

import { useState } from 'react'

import Navbar from './Navbar'
import Sidebar from './Sidebar'

type ShellProps = {
  children: React.ReactNode
}

export default function Shell({ children }: ShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg0)] text-[var(--text1)]">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={() => setIsMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg0)] p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  )
}