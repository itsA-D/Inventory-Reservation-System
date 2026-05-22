import { Redis } from '@upstash/redis'

type IdempotencyResult = {
  body: unknown
  status: number
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

const isRedisConfigured = Boolean(redisUrl && redisToken)

const globalForRedis = globalThis as unknown as {
  redis?: Redis
  hasLoggedRedisWarning?: boolean
}

const redisClient = isRedisConfigured
  ? globalForRedis.redis ??
    new Redis({
      url: redisUrl as string,
      token: redisToken as string,
    })
  : null

if (isRedisConfigured && !globalForRedis.redis && redisClient) {
  globalForRedis.redis = redisClient
}

function logRedisWarning(reason: string): void {
  if (globalForRedis.hasLoggedRedisWarning) {
    return
  }

  globalForRedis.hasLoggedRedisWarning = true
  console.warn(`[redis] ${reason}. Continuing without idempotency cache.`)
}

function buildIdempotencyKey(key: string): string {
  return `idempotency:${key}`
}

export async function getIdempotencyResult(key: string): Promise<IdempotencyResult | null> {
  if (!redisClient) {
    logRedisWarning(
      'UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set'
    )
    return null
  }

  try {
    const cached = await redisClient.get<IdempotencyResult>(buildIdempotencyKey(key))
    return cached ?? null
  } catch {
    logRedisWarning('Failed to read idempotency cache from Upstash')
    return null
  }
}

export async function setIdempotencyResult(
  key: string,
  body: unknown,
  status: number
): Promise<void> {
  if (!redisClient) {
    logRedisWarning(
      'UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set'
    )
    return
  }

  try {
    await redisClient.set(buildIdempotencyKey(key), { body, status }, { ex: 86400 })
  } catch {
    logRedisWarning('Failed to write idempotency cache to Upstash')
  }
}
