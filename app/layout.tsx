import type { Metadata } from 'next'
import './globals.css'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'allo.erp — Multi-Warehouse Inventory & Reservations',
  description: 'Multi-warehouse retail inventory reservation system and dashboard.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn('font-sans', inter.variable, 'dark')}>
      <body className="antialiased selection:bg-zinc-800 selection:text-zinc-100">
        {children}
      </body>
    </html>
  )
}