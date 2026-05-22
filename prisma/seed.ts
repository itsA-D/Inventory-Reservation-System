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
  const seed = name.toLowerCase().replace(/\s+/g, '-')
  return `https://picsum.photos/seed/${seed}/400/400`
}

async function main(): Promise<void> {
  await prisma.reservation.deleteMany()
  await prisma.inventoryItem.deleteMany()
  await prisma.product.deleteMany()
  await prisma.warehouse.deleteMany()

  const createdWarehouses = await Promise.all(
    warehouses.map((warehouse) => prisma.warehouse.create({ data: warehouse }))
  )

  const createdProducts = await Promise.all(
    products.map((product) =>
      prisma.product.create({
        data: {
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl: productImageUrl(product.name),
        },
      })
    )
  )

  const inventoryRows = createdProducts.flatMap((product) =>
    createdWarehouses.map((warehouse) => ({
      productId: product.id,
      warehouseId: warehouse.id,
      totalUnits: totalUnitsByProductAndWarehouse[product.name][warehouse.name],
      reservedUnits: 0,
    }))
  )

  await prisma.inventoryItem.createMany({
    data: inventoryRows,
  })

  console.log('Seed complete: 3 warehouses, 5 products, 15 inventory rows.')
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })