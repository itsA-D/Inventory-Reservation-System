import { Prisma, Reservation } from '@prisma/client'

import { prisma } from './db'
import { ReservationStatusValues } from './reservation-status'

export class InsufficientStockError extends Error {
  constructor(message = 'Not enough stock available') {
    super(message)
    this.name = 'InsufficientStockError'
  }
}

export class ReservationExpiredError extends Error {
  constructor(message = 'Reservation has expired') {
    super(message)
    this.name = 'ReservationExpiredError'
  }
}

export class ReservationNotFoundError extends Error {
  constructor(message = 'Reservation not found') {
    super(message)
    this.name = 'ReservationNotFoundError'
  }
}

export async function atomicReserveStock(
  productId: string,
  warehouseId: string,
  quantity: number,
  tx?: Prisma.TransactionClient
): Promise<boolean> {
  const db = tx ?? prisma

  const result = await db.$executeRaw<number>`
    UPDATE "InventoryItem"
    SET "reservedUnits" = "reservedUnits" + ${quantity}
    WHERE "productId" = ${productId}
      AND "warehouseId" = ${warehouseId}
      AND ("totalUnits" - "reservedUnits") >= ${quantity}
  `

  return result === 1
}

export async function releaseReservationStock(reservationId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId },
    })

    if (!reservation) {
      throw new ReservationNotFoundError()
    }

    if (
      reservation.status !== ReservationStatusValues.PENDING &&
      reservation.status !== ReservationStatusValues.CONFIRMED
    ) {
      throw new Error('Reservation cannot be released from its current status')
    }

    await tx.$executeRaw<number>`
      UPDATE "InventoryItem"
      SET "reservedUnits" = "reservedUnits" - ${reservation.quantity}
      WHERE "productId" = ${reservation.productId}
        AND "warehouseId" = ${reservation.warehouseId}
    `

    await tx.reservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatusValues.RELEASED },
    })
  })
}

export async function confirmReservation(reservationId: string): Promise<Reservation> {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId },
    })

    if (!reservation) {
      throw new ReservationNotFoundError()
    }

    if (reservation.status !== ReservationStatusValues.PENDING) {
      throw new Error('Reservation is not in PENDING status')
    }

    if (reservation.expiresAt < new Date()) {
      throw new ReservationExpiredError()
    }

    const confirmedReservation = await tx.reservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatusValues.CONFIRMED },
    })

    const updatedInventory = await tx.$executeRaw<number>`
      UPDATE "InventoryItem"
      SET
        "totalUnits" = "totalUnits" - ${reservation.quantity},
        "reservedUnits" = "reservedUnits" - ${reservation.quantity}
      WHERE "productId" = ${reservation.productId}
        AND "warehouseId" = ${reservation.warehouseId}
        AND "totalUnits" >= ${reservation.quantity}
        AND "reservedUnits" >= ${reservation.quantity}
    `

    if (updatedInventory !== 1) {
      throw new InsufficientStockError(
        'Unable to finalize inventory while confirming reservation'
      )
    }

    return confirmedReservation
  })
}

export async function expireStaleReservations(): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const now = new Date()

    const expiredReservations = await tx.reservation.findMany({
      where: {
        status: ReservationStatusValues.PENDING,
        expiresAt: {
          lt: now,
        },
      },
      select: {
        id: true,
        productId: true,
        warehouseId: true,
        quantity: true,
      },
    })

    if (expiredReservations.length === 0) {
      return 0
    }

    for (const reservation of expiredReservations) {
      await tx.$executeRaw<number>`
        UPDATE "InventoryItem"
        SET "reservedUnits" = "reservedUnits" - ${reservation.quantity}
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `
    }

    await tx.reservation.updateMany({
      where: {
        id: {
          in: expiredReservations.map((reservation) => reservation.id),
        },
      },
      data: {
        status: ReservationStatusValues.EXPIRED,
      },
    })

    return expiredReservations.length
  })
}
