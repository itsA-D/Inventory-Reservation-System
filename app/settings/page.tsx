import Shell from '@/components/layout/Shell'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  return (
    <Shell>
      <div className="space-y-8 pb-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Configure organization preferences, notifications, and system defaults.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">Organization</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Update workspace identity, default warehouse, and operational roles.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button">Edit Profile</Button>
              <Button type="button" variant="outline">Manage Team</Button>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">System</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Tune reservation windows, notifications, and automation policies.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button">Notification Preferences</Button>
              <Button type="button" variant="outline">Security Settings</Button>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  )
}