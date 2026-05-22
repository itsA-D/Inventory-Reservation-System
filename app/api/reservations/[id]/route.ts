import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import {
  ErrorResponse,
  ErrorResponseSchema,
  ReservationResponse,
  ReservationResponseSchema,
} from '@/lib/schemas'

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

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ReservationResponse | ErrorResponse>> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: context.params.id },
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

    if (!reservation) {
      return NextResponse.json(
        ErrorResponseSchema.parse({
          error: 'NOT_FOUND',
          message: 'Reservation not found',
        }),
        { status: 404 }
      )
    }

    return NextResponse.json(toReservationResponse(reservation))
  } catch {
    return NextResponse.json(
      ErrorResponseSchema.parse({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch reservation',
      }),
      { status: 500 }
    )
  }
}
