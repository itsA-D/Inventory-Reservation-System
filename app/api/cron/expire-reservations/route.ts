import { NextRequest, NextResponse } from 'next/server'

import { expireStaleReservations } from '@/lib/reservation'
import { ErrorResponse, ErrorResponseSchema } from '@/lib/schemas'

type CronResponse = {
  expired: number
  timestamp: string
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<CronResponse | ErrorResponse>> {
  const authHeader = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json(
      ErrorResponseSchema.parse({
        error: 'UNAUTHORIZED',
        message: 'Invalid or missing cron authorization',
      }),
      { status: 401 }
    )
  }

  try {
    const expired = await expireStaleReservations()

    return NextResponse.json({
      expired,
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json(
      ErrorResponseSchema.parse({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to expire stale reservations',
      }),
      { status: 500 }
    )
  }
}
