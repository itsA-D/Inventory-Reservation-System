import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full rounded-xl border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you are looking for does not exist.
        </p>
        <Button asChild className="mt-5">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  )
}
