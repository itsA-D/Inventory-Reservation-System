import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type WarehouseSeed = {
  name: string
  location: string
}

type ProductSeed = {
  name: string
  description: string
  price: string
}

const productImageUrls: Record<string, string> = {
  'Classic White T-Shirt': 'https://loremflickr.com/800/800/t-shirt,shirt,clothing?lock=classic-white-t-shirt',
  'Leather Sneakers': 'https://loremflickr.com/800/800/sneakers,shoes,leather?lock=leather-sneakers',
  'Canvas Backpack': 'https://loremflickr.com/800/800/backpack,bag,canvas?lock=canvas-backpack',
  'Wireless Headphones': 'https://loremflickr.com/800/800/headphones,audio,wireless?lock=wireless-headphones',
  'Minimalist Watch': 'https://loremflickr.com/800/800/watch,wristwatch,minimalist?lock=minimalist-watch',
}

const warehouses: WarehouseSeed[] = [
  {
    name: 'Mumbai Central',
    location: 'Lower Parel, Mumbai, Maharashtra 400013',
  },
  {
    name: 'Delhi North',
    location: 'Model Town Phase II, New Delhi, Delhi 110009',
  },
  {
    name: 'Bangalore South',
    location: 'JP Nagar 7th Phase, Bengaluru, Karnataka 560078',
  },
]

const products: ProductSeed[] = [
  {
    name: 'Classic White T-Shirt',
    description: 'A breathable everyday cotton tee with a clean regular fit.',
    price: '799',
  },
  {
    name: 'Leather Sneakers',
    description: 'Premium low-top leather sneakers designed for all-day comfort.',
    price: '3499',
  },
  {
    name: 'Canvas Backpack',
    description: 'A durable canvas backpack with smart pockets for daily essentials.',
    price: '1999',
  },
  {
    name: 'Wireless Headphones',
    description: 'Over-ear wireless headphones with deep bass and clear voice pickup.',
    price: '5999',
  },
  {
    name: 'Minimalist Watch',
    description: 'A sleek minimalist watch with a stainless steel case and strap.',
    price: '8999',
  },
]

const totalUnitsByProductAndWarehouse: Record<string, Record<string, number>> = {
  'Classic White T-Shirt': {
    'Mumbai Central': 18,
    'Delhi North': 12,
    'Bangalore South': 0,
  },
  'Leather Sneakers': {
    'Mumbai Central': 1,
    'Delhi North': 7,
    'Bangalore South': 5,
  },
  'Canvas Backpack': {
    'Mumbai Central': 0,
    'Delhi North': 16,
    'Bangalore South': 9,
  },
  'Wireless Headphones': {
    'Mumbai Central': 6,
    'Delhi North': 2,
    'Bangalore South': 14,
  },
  'Minimalist Watch': {
    'Mumbai Central': 3,
    'Delhi North': 11,
    'Bangalore South': 20,
  },
}

function productImageUrl(name: string): string {
  return productImageUrls[name] ?? 'https://loremflickr.com/800/800/products?lock=default-product'
}

async function main(): Promise<void> {
  const seededWarehouses = await Promise.all(
    warehouses.map((warehouse) =>
      prisma.warehouse.upsert({
        where: { name: warehouse.name },
        update: {},
        create: warehouse,
      })
    )
  )

  const seededProducts = await Promise.all(
    products.map((product) =>
      prisma.product.upsert({
        where: { name: product.name },
        update: {},
        create: {
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl: productImageUrl(product.name),
        },
      })
    )
  )

  let createdInventoryRows = 0

  for (const product of seededProducts) {
    for (const warehouse of seededWarehouses) {
      const existingInventory = await prisma.inventoryItem.findUnique({
        where: {
          productId_warehouseId: {
            productId: product.id,
            warehouseId: warehouse.id,
          },
        },
      })

      if (existingInventory) {
        continue
      }

      await prisma.inventoryItem.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          totalUnits: totalUnitsByProductAndWarehouse[product.name][warehouse.name],
          reservedUnits: 0,
        },
      })

      createdInventoryRows += 1
    }
  }

  console.log(
    `Seed complete: ${seededWarehouses.length} warehouses, ${seededProducts.length} products, ${createdInventoryRows} new inventory rows created.`
  )
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
