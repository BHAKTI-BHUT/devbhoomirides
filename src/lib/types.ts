// Domain types. These mirror the planned database tables (see PLAN.md) so the
// fixtures in src/data/fixtures.ts can later be swapped for real queries.

export type GeoPoint = { lat: number; lng: number }

export type RouteStop = {
  id: string
  name: string
  /** Position on the route, 0 = route origin. Admin-reorderable. */
  order: number
  /** Typical minutes from the route origin, used to suggest ETAs. */
  offsetMinutes: number
  distanceKm: number
  location: GeoPoint
  pickupPoints: string[]
}

export type Route = {
  id: string
  name: string
  stops: RouteStop[]
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended'

export type Driver = {
  id: string
  name: string
  rating: number
  ratingCount: number
  completedTrips: number
  verification: VerificationStatus
  memberSince: string
  isDemo: true
}

export type Vehicle = {
  id: string
  driverId: string
  type: string
  model: string
  registrationNumber: string
  passengerSeats: number
  photoUrl?: string
}

export type TripStatus =
  | 'draft'
  | 'pending_approval'
  | 'published'
  | 'booking_open'
  | 'fully_booked'
  | 'trip_started'
  | 'trip_completed'
  | 'cancelled'

export type TripStop = {
  stopId: string
  name: string
  /** Order within this trip. A return trip simply lists stops in reverse. */
  order: number
  eta: string // HH:mm
  pickupPoints: string[]
}

export type Trip = {
  id: string
  routeId: string
  driverId: string
  vehicleId: string
  date: string // YYYY-MM-DD
  departureTime: string // HH:mm
  totalSeats: number
  bookedSeats: number
  pricePerSeat: number
  status: TripStatus
  isReturn: boolean
  stops: TripStop[]
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled_by_customer'
  | 'cancelled_by_driver'
  | 'completed'
  | 'no_show'
  | 'refund_pending'
  | 'refunded'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refund_pending' | 'refunded'

export type Passenger = { name: string; age: string; gender: '' | 'female' | 'male' | 'other' }

export type Booking = {
  id: string // DR-2026-000123
  tripId: string
  pickupStopId: string
  pickupPoint: string
  dropStopId: string
  seats: number
  passengers: Passenger[]
  contactPhone: string
  fare: FareBreakdown
  status: BookingStatus
  paymentStatus: PaymentStatus
  paymentMode: 'demo'
  createdAt: string
  cancelledAt?: string
  refundAmount?: number
}

export type FareBreakdown = {
  seats: number
  pricePerSeat: number
  rideFare: number
  bookingFee: number
  total: number
}

export type CancellationRule = {
  /** Applies when departure is at least this many hours away. */
  minHoursBefore: number
  refundPercent: number
  label: string
}

export type PlatformSettings = {
  bookingFee: number
  commissionPercent: number
  cancellationRules: CancellationRule[]
  paymentGatewayConfigured: boolean
}
