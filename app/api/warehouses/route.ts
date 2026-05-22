import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { ErrorResponse, ErrorResponseSchema } from '@/lib/schemas'

type WarehouseResponse = {
  id: string
  name: string
  location: string
}

export async function GET(): Promise<NextResponse<WarehouseResponse[] | ErrorResponse>> {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    const response: WarehouseResponse[] = warehouses.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
      location: warehouse.location,
    }))

    return NextResponse.json(response)
  } catch {
    const errorPayload = ErrorResponseSchema.parse({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch warehouses',
    })

    return NextResponse.json(errorPayload, { status: 500 })
  }
}
