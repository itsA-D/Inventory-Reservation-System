import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { prisma } from '@/lib/db'
import { getIdempotencyResult, setIdempotencyResult } from '@/lib/redis'
import { atomicReserveStock, InsufficientStockError } from '@/lib/reservation'
import { ReservationStatusValues } from '@/lib/reservation-status'
import {
  CreateReservationSchema,
  ErrorResponse,
  ErrorResponseSchema,
  ReservationListItem,
  ReservationListItemSchema,
  ReservationResponse,
  ReservationResponseSchema,
} from '@/lib/schemas'

export const revalidate = 0

async function getReservationByIdempotencyKey(
  idempotencyKey: string
): Promise<ReservationResponse | null> {
  const reservation = await prisma.reservation.findUnique({
    where: { idempotencyKey },
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

  return reservation ? toReservationResponse(reservation) : null
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

function toReservationListItem(data: {
  id: string
  status: string
  quantity: number
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
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
}): ReservationListItem {
  return ReservationListItemSchema.parse({
    id: data.id,
    status: data.status,
    quantity: data.quantity,
    expiresAt: data.expiresAt.toISOString(),
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
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
  request: NextRequest
): Promise<NextResponse<ReservationListItem[] | ErrorResponse>> {
  try {
    const status = request.nextUrl.searchParams.get('status')
    const allowedStatuses = Object.values(ReservationStatusValues)

    if (status && !allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
      return NextResponse.json(
        ErrorResponseSchema.parse({
          error: 'VALIDATION_ERROR',
          message: 'Invalid reservation status',
        }),
        { status: 400 }
      )
    }

    const reservations = await prisma.reservation.findMany({
      where: status ? { status } : undefined,
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
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json(reservations.map(toReservationListItem))
  } catch {
    return NextResponse.json(
      ErrorResponseSchema.parse({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch reservations',
      }),
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ReservationResponse | ErrorResponse>> {
  try {
    const idempotencyKey = request.headers.get('Idempotency-Key')

    if (idempotencyKey) {
      const cached = await getIdempotencyResult(idempotencyKey)
      if (cached) {
        return NextResponse.json(cached.body as ReservationResponse | ErrorResponse, {
          status: cached.status,
        })
      }

      const existingReservation = await getReservationByIdempotencyKey(idempotencyKey)
      if (existingReservation) {
        await setIdempotencyResult(idempotencyKey, existingReservation, 201)
        return NextResponse.json(existingReservation, { status: 201 })
      }
    }

    const body: unknown = await request.json()
    const parsedBody = CreateReservationSchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json(
        ErrorResponseSchema.parse({
          error: 'VALIDATION_ERROR',
          message: parsedBody.error.issues.map((issue) => issue.message).join('; '),
        }),
        { status: 400 }
      )
    }

    const { productId, warehouseId, quantity } = parsedBody.data

    const [product, warehouse] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.warehouse.findUnique({ where: { id: warehouseId } }),
    ])

    if (!product || !warehouse) {
      return NextResponse.json(
        ErrorResponseSchema.parse({
          error: 'NOT_FOUND',
          message: 'Product or warehouse not found',
        }),
        { status: 404 }
      )
    }

    const reservation = await prisma.$transaction(async (tx) => {
      const reserved = await atomicReserveStock(productId, warehouseId, quantity, tx)

      if (!reserved) {
        throw new InsufficientStockError()
      }

      return tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: ReservationStatusValues.PENDING,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          idempotencyKey: idempotencyKey ?? undefined,
        },
      })
    })

    const fullReservation = await prisma.reservation.findUnique({
      where: { id: reservation.id },
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

    if (!fullReservation) {
      return NextResponse.json(
        ErrorResponseSchema.parse({
          error: 'NOT_FOUND',
          message: 'Reservation not found after creation',
        }),
        { status: 404 }
      )
    }

    const responseBody = toReservationResponse(fullReservation)

    if (idempotencyKey) {
      await setIdempotencyResult(idempotencyKey, responseBody, 201)
    }

    return NextResponse.json(responseBody, { status: 201 })
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const idempotencyKey = request.headers.get('Idempotency-Key')

      if (idempotencyKey) {
        const existingReservation = await getReservationByIdempotencyKey(idempotencyKey)

        if (existingReservation) {
          await setIdempotencyResult(idempotencyKey, existingReservation, 201)
          return NextResponse.json(existingReservation, { status: 201 })
        }
      }
    }

    if (error instanceof InsufficientStockError) {
      const payload = ErrorResponseSchema.parse({
        error: 'INSUFFICIENT_STOCK',
        message: 'Not enough stock available',
      })
      return NextResponse.json(payload, { status: 409 })
    }

    if (error instanceof z.ZodError) {
      const payload = ErrorResponseSchema.parse({
        error: 'VALIDATION_ERROR',
        message: error.issues.map((issue) => issue.message).join('; '),
      })
      return NextResponse.json(payload, { status: 400 })
    }

    const payload = ErrorResponseSchema.parse({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create reservation',
    })

    return NextResponse.json(payload, { status: 500 })
  }
}
