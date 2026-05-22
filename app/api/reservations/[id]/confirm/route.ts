import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import {
  confirmReservation,
  InsufficientStockError,
  ReservationExpiredError,
  ReservationNotFoundError,
} from '@/lib/reservation'
import {
  ErrorResponse,
  ErrorResponseSchema,
  ReservationResponse,
  ReservationResponseSchema,
} from '@/lib/schemas'
import { ReservationStatusValues } from '@/lib/reservation-status'

type RouteContext = {
  params: {
    id: string
  }
}

function toReservationResponse(data: {
  id: string
  status: string
  expiresAt: Date
  quantity: number
  product: {
    id: string
    name: string
    price: { toString(): string }
  }
  warehouse: {
    id: string
    name: string
    location: string
  }
}): ReservationResponse {
  return ReservationResponseSchema.parse({
    id: data.id,
    status: data.status,
    expiresAt: data.expiresAt.toISOString(),
    quantity: data.quantity,
    product: {
      id: data.product.id,
      name: data.product.name,
      price: data.product.price.toString(),
    },
    warehouse: {
      id: data.warehouse.id,
      name: data.warehouse.name,
      location: data.warehouse.location,
    },
  })
}

export async function POST(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ReservationResponse | ErrorResponse>> {
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

    if (existing.expiresAt < new Date()) {
      return NextResponse.json(
        ErrorResponseSchema.parse({
          error: 'RESERVATION_EXPIRED',
          message: 'Reservation has expired',
        }),
        { status: 410 }
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

    await confirmReservation(reservationId)

    const updated = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    })

    if (!updated) {
      return NextResponse.json(
        ErrorResponseSchema.parse({
          error: 'NOT_FOUND',
          message: 'Reservation not found after confirm',
        }),
        { status: 404 }
      )
    }

    return NextResponse.json(toReservationResponse(updated))
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

    if (error instanceof ReservationExpiredError) {
      return NextResponse.json(
        ErrorResponseSchema.parse({
          error: 'RESERVATION_EXPIRED',
          message: 'Reservation has expired',
        }),
        { status: 410 }
      )
    }

    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        ErrorResponseSchema.parse({
          error: 'INVALID_STATUS',
          message: 'Reservation cannot be confirmed',
        }),
        { status: 409 }
      )
    }

    return NextResponse.json(
      ErrorResponseSchema.parse({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to confirm reservation',
      }),
      { status: 500 }
    )
  }
}
