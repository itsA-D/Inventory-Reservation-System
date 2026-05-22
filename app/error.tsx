'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

type ErrorProps = {
  error: Error & { digest?: string }
}

export default function Error({ error }: ErrorProps) {
  const router = useRouter()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full rounded-xl border bg-card p-6 text-center">
        <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We could not load this page. Please try again.
        </p>
        <Button className="mt-5" onClick={() => router.refresh()}>
          Try again
        </Button>
      </div>
    </main>
  )
}
