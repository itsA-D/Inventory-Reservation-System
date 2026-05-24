import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

export const revalidate = 0

export async function GET(): Promise<NextResponse<{ count: number }>> {
  const count = await prisma.reservation.count({
    where: {
      status: 'CONFIRMED',
    },
  })

  return NextResponse.json({ count })
}