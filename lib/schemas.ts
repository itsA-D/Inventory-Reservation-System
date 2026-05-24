import { z } from 'zod'

export const CreateReservationSchema = z
  .object({
    productId: z.string().uuid(),
    warehouseId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })
  .strict()

const ReservationProductSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    price: z.union([z.number(), z.string()]),
  })
  .strict()

const ReservationWarehouseSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    location: z.string(),
  })
  .strict()

export const ReservationResponseSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(['PENDING', 'CONFIRMED', 'RELEASED', 'EXPIRED']),
    expiresAt: z.string().datetime(),
    quantity: z.number().int().positive(),
    product: ReservationProductSchema,
    warehouse: ReservationWarehouseSchema,
  })
  .strict()

const InventoryStockItemSchema = z
  .object({
    warehouseId: z.string().uuid(),
    warehouseName: z.string(),
    totalUnits: z.number().int().nonnegative(),
    reservedUnits: z.number().int().nonnegative(),
    availableUnits: z.number().int().nonnegative(),
  })
  .strict()

export const ProductWithStockSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    price: z.union([z.number(), z.string()]),
    imageUrl: z.string().url().nullable(),
    inventory: z.array(InventoryStockItemSchema),
  })
  .strict()

const ReservationListProductSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    price: z.union([z.number(), z.string()]),
  })
  .strict()

const ReservationListWarehouseSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    location: z.string(),
  })
  .strict()

export const ReservationListItemSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(['PENDING', 'CONFIRMED', 'RELEASED', 'EXPIRED']),
    quantity: z.number().int().positive(),
    expiresAt: z.string().datetime(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    product: ReservationListProductSchema,
    warehouse: ReservationListWarehouseSchema,
  })
  .strict()

export const ErrorResponseSchema = z
  .object({
    error: z.string(),
    message: z.string(),
  })
  .strict()

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>
export type ReservationResponse = z.infer<typeof ReservationResponseSchema>
export type ProductWithStock = z.infer<typeof ProductWithStockSchema>
export type ReservationListItem = z.infer<typeof ReservationListItemSchema>
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
