import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/db'
import { expireStaleReservations } from '@/lib/reservation'
import {
  ErrorResponse,
  ErrorResponseSchema,
  ProductWithStock,
  ProductWithStockSchema,
} from '@/lib/schemas'

export const revalidate = 0

export async function GET(): Promise<NextResponse<ProductWithStock[] | ErrorResponse>> {
  try {
    await expireStaleReservations()

    const products = await prisma.product.findMany({
      include: {
        inventory: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const payload = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      imageUrl: product.imageUrl,
      inventory: product.inventory.map((item) => ({
        warehouseId: item.warehouseId,
        warehouseName: item.warehouse.name,
        totalUnits: item.totalUnits,
        reservedUnits: item.reservedUnits,
        availableUnits: item.totalUnits - item.reservedUnits,
      })),
    }))

    const response = z.array(ProductWithStockSchema).parse(payload)

    return NextResponse.json(response)
  } catch {
    const errorPayload = ErrorResponseSchema.parse({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch products',
    })

    return NextResponse.json(errorPayload, { status: 500 })
  }
}
