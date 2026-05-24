import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const deferredPropertyNames = new Set([
  'then',
  'catch',
  'finally',
  'constructor',
  'toJSON',
  'valueOf',
])

function createPrismaClient(): PrismaClient {
  return new PrismaClient({ log: ['query'] })
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }

  return globalForPrisma.prisma
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    if (typeof property === 'symbol') {
      return undefined
    }

    if (deferredPropertyNames.has(property)) {
      return undefined
    }

    const client = getPrismaClient()
    const value = Reflect.get(client, property, receiver)

    return typeof value === 'function' ? value.bind(client) : value
  },
})
