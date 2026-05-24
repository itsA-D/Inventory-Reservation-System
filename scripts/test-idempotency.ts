export {}

type InventoryItem = {
  warehouseId: string
  warehouseName: string
  totalUnits: number
  reservedUnits: number
  availableUnits: number
}

type ProductWithStock = {
  id: string
  name: string
  inventory: InventoryItem[]
}

type ReservationResponse = {
  id: string
  status: string
  quantity: number
  expiresAt: string
  product: {
    id: string
    name: string
    price: string | number
  }
  warehouse: {
    id: string
    name: string
    location: string
  }
}

type RequestResult = {
  status: number
  body: unknown
}

type ReservationTarget = {
  productId: string
  productName: string
  warehouseId: string
  warehouseName: string
  availableUnits: number
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function parseArgs(): { baseUrl: string } {
  const [, , baseUrl = 'http://localhost:3000'] = process.argv

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function fetchProducts(baseUrl: string): Promise<ProductWithStock[]> {
  const response = await fetch(`${baseUrl}/api/products`, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as ProductWithStock[]
}

function flattenTargets(products: ProductWithStock[]): ReservationTarget[] {
  return products.flatMap((product) =>
    product.inventory.map((inventory) => ({
      productId: product.id,
      productName: product.name,
      warehouseId: inventory.warehouseId,
      warehouseName: inventory.warehouseName,
      availableUnits: inventory.availableUnits,
    }))
  )
}

function pickTargets(products: ProductWithStock[]): {
  primary: ReservationTarget
  secondary: ReservationTarget
} {
  const candidates = flattenTargets(products)
    .filter((target) => target.availableUnits > 0)
    .sort((left, right) => right.availableUnits - left.availableUnits)

  assert(candidates.length >= 2, 'Need at least two in-stock product/warehouse targets')

  const primary = candidates[0]
  const secondary = candidates.find(
    (target) =>
      target.productId !== primary.productId || target.warehouseId !== primary.warehouseId
  )

  assert(secondary, 'Could not find a distinct second in-stock target')

  return { primary, secondary }
}

function getAvailableUnits(
  products: ProductWithStock[],
  productId: string,
  warehouseId: string
): number {
  const product = products.find((item) => item.id === productId)
  const inventory = product?.inventory.find((item) => item.warehouseId === warehouseId)

  assert(inventory, `Target ${productId}/${warehouseId} not found in /api/products`)

  return inventory.availableUnits
}

async function createReservation(
  baseUrl: string,
  payload: { productId: string; warehouseId: string; quantity: number },
  idempotencyKey: string
): Promise<RequestResult> {
  const response = await fetch(`${baseUrl}/api/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  })

  return {
    status: response.status,
    body: await readJson(response),
  }
}

async function releaseReservation(baseUrl: string, reservationId: string): Promise<void> {
  const response = await fetch(`${baseUrl}/api/reservations/${reservationId}/release`, {
    method: 'POST',
  })

  if (!response.ok) {
    const body = await readJson(response)
    throw new Error(
      `Failed to release reservation ${reservationId}: ${response.status} ${JSON.stringify(body)}`
    )
  }
}

function isReservationResponse(body: unknown): body is ReservationResponse {
  return typeof body === 'object' && body !== null && 'id' in body && 'status' in body
}

function assertIdenticalResponses(first: RequestResult, second: RequestResult, label: string): void {
  assert(
    first.status === second.status,
    `${label}: expected identical status codes, received ${first.status} and ${second.status}`
  )

  assert(
    JSON.stringify(first.body) === JSON.stringify(second.body),
    `${label}: expected identical response bodies`
  )
}

async function testSimultaneousDuplicateRequests(
  baseUrl: string,
  target: ReservationTarget
): Promise<void> {
  console.log('Test 1: simultaneous duplicate request with same idempotency key')
  console.log(
    `Target: ${target.productName} @ ${target.warehouseName} (available before: ${target.availableUnits})`
  )

  const beforeProducts = await fetchProducts(baseUrl)
  const beforeAvailable = getAvailableUnits(beforeProducts, target.productId, target.warehouseId)
  const key = crypto.randomUUID()

  const payload = {
    productId: target.productId,
    warehouseId: target.warehouseId,
    quantity: 1,
  }

  const [first, second] = await Promise.all([
    createReservation(baseUrl, payload, key),
    createReservation(baseUrl, payload, key),
  ])

  console.log(`Response A: ${first.status}`)
  console.log(JSON.stringify(first.body, null, 2))
  console.log(`Response B: ${second.status}`)
  console.log(JSON.stringify(second.body, null, 2))

  assertIdenticalResponses(first, second, 'Test 1')
  assert(first.status === 201, `Test 1: expected status 201, received ${first.status}`)
  assert(isReservationResponse(first.body), 'Test 1: expected a reservation response body')

  const afterProducts = await fetchProducts(baseUrl)
  const afterAvailable = getAvailableUnits(afterProducts, target.productId, target.warehouseId)

  assert(
    beforeAvailable - afterAvailable === 1,
    `Test 1: expected stock to decrease by exactly 1, changed by ${beforeAvailable - afterAvailable}`
  )

  await releaseReservation(baseUrl, first.body.id)

  const restoredProducts = await fetchProducts(baseUrl)
  const restoredAvailable = getAvailableUnits(
    restoredProducts,
    target.productId,
    target.warehouseId
  )

  assert(
    restoredAvailable === beforeAvailable,
    `Test 1: expected stock to restore to ${beforeAvailable} after cleanup, found ${restoredAvailable}`
  )

  console.log('Test 1 passed.')
}

async function testKeyReuseAcrossDifferentPayloads(
  baseUrl: string,
  primary: ReservationTarget,
  secondary: ReservationTarget
): Promise<void> {
  console.log('Test 2: reuse same idempotency key with a different payload')
  console.log(
    `Primary target: ${primary.productName} @ ${primary.warehouseName} (available before: ${primary.availableUnits})`
  )
  console.log(
    `Secondary target: ${secondary.productName} @ ${secondary.warehouseName} (available before: ${secondary.availableUnits})`
  )

  const beforeProducts = await fetchProducts(baseUrl)
  const beforePrimary = getAvailableUnits(beforeProducts, primary.productId, primary.warehouseId)
  const beforeSecondary = getAvailableUnits(
    beforeProducts,
    secondary.productId,
    secondary.warehouseId
  )
  const key = crypto.randomUUID()

  const first = await createReservation(
    baseUrl,
    {
      productId: primary.productId,
      warehouseId: primary.warehouseId,
      quantity: 1,
    },
    key
  )

  console.log(`First response: ${first.status}`)
  console.log(JSON.stringify(first.body, null, 2))

  assert(first.status === 201, `Test 2: expected first status 201, received ${first.status}`)
  assert(isReservationResponse(first.body), 'Test 2: expected first response to be a reservation')

  const second = await createReservation(
    baseUrl,
    {
      productId: secondary.productId,
      warehouseId: secondary.warehouseId,
      quantity: 1,
    },
    key
  )

  console.log(`Second response: ${second.status}`)
  console.log(JSON.stringify(second.body, null, 2))

  assertIdenticalResponses(first, second, 'Test 2')

  const afterProducts = await fetchProducts(baseUrl)
  const afterPrimary = getAvailableUnits(afterProducts, primary.productId, primary.warehouseId)
  const afterSecondary = getAvailableUnits(
    afterProducts,
    secondary.productId,
    secondary.warehouseId
  )

  assert(
    beforePrimary - afterPrimary === 1,
    `Test 2: expected primary stock to decrease by exactly 1, changed by ${beforePrimary - afterPrimary}`
  )
  assert(
    beforeSecondary === afterSecondary,
    `Test 2: expected secondary stock to remain unchanged at ${beforeSecondary}, found ${afterSecondary}`
  )

  await releaseReservation(baseUrl, first.body.id)

  const restoredProducts = await fetchProducts(baseUrl)
  const restoredPrimary = getAvailableUnits(
    restoredProducts,
    primary.productId,
    primary.warehouseId
  )

  assert(
    restoredPrimary === beforePrimary,
    `Test 2: expected primary stock to restore to ${beforePrimary} after cleanup, found ${restoredPrimary}`
  )

  console.log('Test 2 passed.')
}

async function main(): Promise<void> {
  const { baseUrl } = parseArgs()

  console.log(`Base URL: ${baseUrl}`)
  console.log('Usage: npx ts-node scripts/test-idempotency.ts http://localhost:3000')

  const initialProducts = await fetchProducts(baseUrl)
  const { primary, secondary } = pickTargets(initialProducts)

  await testSimultaneousDuplicateRequests(baseUrl, primary)

  const refreshedProducts = await fetchProducts(baseUrl)
  const refreshedTargets = pickTargets(refreshedProducts)

  await testKeyReuseAcrossDifferentPayloads(
    baseUrl,
    refreshedTargets.primary,
    refreshedTargets.secondary
  )

  console.log('All idempotency tests passed.')
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error(message)
  process.exit(1)
})
