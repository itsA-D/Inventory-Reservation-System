import { argv } from 'process'

async function run() {
  const baseUrl = argv[2] || 'http://localhost:3000'
  console.log(`Starting concurrency test against: ${baseUrl}`)

  try {
    // 1. Fetch products to get the IDs
    const productsRes = await fetch(`${baseUrl}/api/products`, { cache: 'no-store' })
    if (!productsRes.ok) {
      throw new Error(`Failed to fetch products: ${productsRes.statusText}`)
    }

    const products = (await productsRes.json()) as any[]
    
    // Find "Leather Sneakers"
    const sneakers = products.find((p) => p.name === 'Leather Sneakers')
    if (!sneakers) {
      throw new Error('Leather Sneakers not found in seeded database!')
    }

    // Find "Mumbai Central" warehouse in the sneakers inventory
    const mumbaiCentralInventory = sneakers.inventory.find(
      (inv: any) => inv.warehouseName === 'Mumbai Central'
    )
    if (!mumbaiCentralInventory) {
      throw new Error('Mumbai Central inventory not found for Leather Sneakers!')
    }

    const productId = sneakers.id
    const warehouseId = mumbaiCentralInventory.warehouseId
    const initialAvailable = mumbaiCentralInventory.availableUnits

    console.log(`\nProduct: Leather Sneakers (ID: ${productId})`)
    console.log(`Warehouse: Mumbai Central (ID: ${warehouseId})`)
    console.log(`Initial Available Stock: ${initialAvailable}\n`)

    if (initialAvailable === 0) {
      console.warn(
        '⚠️ Warning: Initial available stock is 0. Concurrency test may not show the correct behavior unless stock is reset/seeded first.'
      )
    }

    // 2. Fire 5 simultaneous reservation requests
    console.log(`Firing 5 simultaneous reservation requests...`)
    const requests = Array.from({ length: 5 }).map(async (_, index) => {
      const requestId = index + 1
      try {
        const res = await fetch(`${baseUrl}/api/reservations`, {
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

        const status = res.status
        let body: any = null
        try {
          body = await res.json()
        } catch {
          // ignore
        }

        return { requestId, status, body }
      } catch (err: any) {
        return { requestId, status: 500, error: err.message }
      }
    })

    const results = await Promise.all(requests)

    console.log('\nResults:')
    let successes = 0
    let conflicts = 0
    let errors = 0

    results.forEach((res: any) => {
      if (res.status === 201) {
        successes++
        console.log(`Request ${res.requestId}: 201 Created ✓  Reservation ID: ${res.body?.id}`)
      } else if (res.status === 409) {
        conflicts++
        console.log(`Request ${res.requestId}: 409 Conflict ✓  ${res.body?.error || 'INSUFFICIENT_STOCK'}`)
      } else {
        errors++
        console.log(
          `Request ${res.requestId}: ${res.status} Error ✗  ${
            res.error || JSON.stringify(res.body)
          }`
        )
      }
    })

    console.log('\nSummary:')
    console.log(`- Successes (201): ${successes}`)
    console.log(`- Conflicts (409): ${conflicts}`)
    console.log(`- Errors / Other: ${errors}`)

    if (successes === 1 && conflicts === 4) {
      console.log('\n✅ PASS — Exactly 1 reservation created, race condition handled correctly!')
    } else {
      console.log('\n❌ FAIL — Expected 1 success and 4 conflicts. Race condition handled incorrectly or seed is incorrect.')
    }
  } catch (error: any) {
    console.error('Test run failed:', error.message)
    process.exit(1)
  }
}

run()
