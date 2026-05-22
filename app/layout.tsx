import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'allo',
  description: 'Inventory reservation system for multi-warehouse retail',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn('font-sans', inter.variable)}>
      <body>
        <header className="border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <Link href="/" className="text-lg font-bold tracking-tight">
              allo.
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}