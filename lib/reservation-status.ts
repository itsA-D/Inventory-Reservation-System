export const ReservationStatusValues = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  RELEASED: 'RELEASED',
  EXPIRED: 'EXPIRED',
} as const

export type ReservationStatus =
  (typeof ReservationStatusValues)[keyof typeof ReservationStatusValues]