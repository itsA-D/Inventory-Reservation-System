export {}

type InventoryItem = {
  warehouseId: string
  warehouseName: string
  availableUnits: number
}

type ProductWithStock = {
  id: string
  name: string
  inventory: InventoryItem[]
}

type ReservationTestResult = {
  requestNumber: number
  status: number
  body: unknown
}

function parseArgs(): {
  baseUrl: string
  productId?: string
  warehouseId?: string
} {
  const [, , baseUrl = 'http://localhost:3000', productId, warehouseId] = process.argv

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    productId,
    warehouseId,
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

async function resolveTarget(
  baseUrl: string,
  productId?: string,
  warehouseId?: string
): Promise<{ productId: string; warehouseId: string; productName: string; warehouseName: string }> {
  const response = await fetch(`${baseUrl}/api/products`, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`)
  }

  const products = (await response.json()) as ProductWithStock[]

  if (productId && warehouseId) {
    const product = products.find((item) => item.id === productId)
    const inventory = product?.inventory.find((item) => item.warehouseId === warehouseId)

    if (!product || !inventory) {
      throw new Error('Provided productId/warehouseId was not found in /api/products')
    }

    if (inventory.availableUnits !== 1) {
      throw new Error(
        `Provided target has ${inventory.availableUnits} available units, expected exactly 1`
      )
    }

    return {
      productId,
      warehouseId,
      productName: product.name,
      warehouseName: inventory.warehouseName,
    }
  }

  const seededProduct = products.find((item) => item.name === 'Leather Sneakers')
  const seededInventory = seededProduct?.inventory.find(
    (item) => item.warehouseName === 'Mumbai Central'
  )

  if (!seededProduct || !seededInventory) {
    throw new Error(
      'Could not find seeded target: "Leather Sneakers" at "Mumbai Central" in /api/products'
    )
  }

  if (seededInventory.availableUnits !== 1) {
    throw new Error(
      `Seeded target has ${seededInventory.availableUnits} available units, expected exactly 1`
    )
  }

  return {
    productId: seededProduct.id,
    warehouseId: seededInventory.warehouseId,
    productName: seededProduct.name,
    warehouseName: seededInventory.warehouseName,
  }
}

async function createReservation(
  baseUrl: string,
  requestNumber: number,
  productId: string,
  warehouseId: string
): Promise<ReservationTestResult> {
  const response = await fetch(`${baseUrl}/api/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId,
      warehouseId,
      quantity: 1,
    }),
  })

  return {
    requestNumber,
    status: response.status,
    body: await readJson(response),
  }
}

async function main(): Promise<void> {
  const { baseUrl, productId: cliProductId, warehouseId: cliWarehouseId } = parseArgs()

  console.log(`Base URL: ${baseUrl}`)
  console.log(
    'Usage: npx ts-node scripts/test-concurrency.ts http://localhost:3000 [productId] [warehouseId]'
  )

  const target = await resolveTarget(baseUrl, cliProductId, cliWarehouseId)

  console.log(`Product: ${target.productName} (${target.productId})`)
  console.log(`Warehouse: ${target.warehouseName} (${target.warehouseId})`)
  console.log('Available units before test: 1')
  console.log('Sending 5 simultaneous POST /api/reservations requests...')

  const results = await Promise.all(
    Array.from({ length: 5 }, (_, index) =>
      createReservation(baseUrl, index + 1, target.productId, target.warehouseId)
    )
  )

  for (const result of results) {
    console.log(`Request ${result.requestNumber}: ${result.status}`)
    console.log(JSON.stringify(result.body, null, 2))
  }

  const createdCount = results.filter((result) => result.status === 201).length
  const conflictCount = results.filter((result) => result.status === 409).length

  console.log(`201 responses: ${createdCount}`)
  console.log(`409 responses: ${conflictCount}`)

  if (createdCount !== 1 || conflictCount !== 4) {
    throw new Error(
      `Assertion failed: expected exactly 1 response with 201 and 4 responses with 409, received ${createdCount} and ${conflictCount}`
    )
  }

  console.log('Assertion passed: exactly 1 response was 201 and exactly 4 responses were 409.')
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error(message)
  process.exit(1)
})
