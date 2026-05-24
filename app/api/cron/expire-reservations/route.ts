import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    disabled: true,
    message: 'Cron is temporarily disabled while deployment is being stabilized.',
    timestamp: new Date().toISOString(),
  })
}
