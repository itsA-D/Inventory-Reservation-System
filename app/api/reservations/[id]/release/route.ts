import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { releaseReservationStock, ReservationNotFoundError } from '@/lib/reservation'
import { ErrorResponse, ErrorResponseSchema } from '@/lib/schemas'
import { ReservationStatusValues } from '@/lib/reservation-status'

type RouteContext = {
  params: {
    id: string
  }
}

type ReleaseResponse = {
  success: true
}

export async function POST(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ReleaseResponse | ErrorResponse>> {
  const reservationId = context.params.id

  try {
    const existing = await prisma.reservation.findUnique({
      where: { id: reservationId },
    })

    if (!existing) {
      return NextResponse.json(
        ErrorResponseSchema.parse({
          error: 'NOT_FOUND',
          message: 'Reservation not found',
        }),
        { status: 404 }
      )
    }

    if (existing.status !== ReservationStatusValues.PENDING) {
      return NextResponse.json(
        ErrorResponseSchema.parse({
          error: 'INVALID_STATUS',
          message: 'Reservation is not in PENDING status',
        }),
        { status: 409 }
      )
    }

    await releaseReservationStock(reservationId)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof ReservationNotFoundError) {
      return NextResponse.json(
        ErrorResponseSchema.parse({
          error: 'NOT_FOUND',
          message: 'Reservation not found',
        }),
        { status: 404 }
      )
    }

    return NextResponse.json(
      ErrorResponseSchema.parse({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to release reservation',
      }),
      { status: 500 }
    )
  }
}
