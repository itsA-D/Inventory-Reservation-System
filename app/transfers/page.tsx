import { ArrowRightLeft } from 'lucide-react'

import Shell from '@/components/layout/Shell'
import { Button } from '@/components/ui/button'

export default function TransfersPage() {
  return (
    <Shell>
      <div className="space-y-8 pb-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Stock Transfers</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Move inventory between warehouse locations.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col items-center gap-4 text-center">
            <ArrowRightLeft className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <div className="space-y-1">
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">No transfers recorded</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Create and track stock movements between warehouses from here.</p>
            </div>
            <Button type="button" className="mt-2 rounded-full px-5">
              New Transfer →
            </Button>
            {/* TODO: implement transfer creation flow */}
          </div>
        </div>
      </div>
    </Shell>
  )
}