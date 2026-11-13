// Devbhoomi Rides — database schema (Netlify Database / Postgres, Drizzle ORM).
// Money is always stored as integer paise (₹1 = 100 paise) to avoid rounding drift.
// Financial tables are append-only: amounts never change after insert and rows are
// never deleted (enforced by triggers in the `add_financial_integrity_guards` migration).
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSequence,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const id = () => uuid('id').primaryKey().defaultRandom()
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

// ── Enums ────────────────────────────────────────────────────────────────────
export const userRole = pgEnum('user_role', ['customer', 'driver', 'admin'])
export const accountStatus = pgEnum('account_status', ['active', 'inactive', 'suspended', 'archived'])
export const verificationStatus = pgEnum('verification_status', ['pending', 'verified', 'rejected', 'suspended'])
export const recordStatus = pgEnum('record_status', ['active', 'inactive', 'archived'])
export const tripStatus = pgEnum('trip_status', [
  'draft',
  'published',
  'booking_open',
  'fully_booked',
  'trip_started',
  'trip_completed',
  'cancelled',
])
export const bookingStatus = pgEnum('booking_status', [
  'pending_payment',
  'confirmed',
  'payment_failed',
  'expired',
  'cancelled_by_customer',
  'cancelled_by_driver',
  'cancelled_by_system',
  'completed',
  'no_show',
])
export const paymentStatus = pgEnum('payment_status', [
  'created',
  'pending',
  'paid',
  'failed',
  'cancelled',
  'refund_pending',
  'partially_refunded',
  'refunded',
])
export const refundStatus = pgEnum('refund_status', ['requested', 'approved', 'processing', 'completed', 'failed', 'rejected'])
export const payoutStatus = pgEnum('payout_status', ['pending', 'approved', 'processing', 'paid', 'failed', 'cancelled'])
export const payoutMethod = pgEnum('payout_method', ['bank_transfer', 'upi', 'other'])
export const financialMode = pgEnum('financial_mode', ['test', 'live'])
export const txnType = pgEnum('txn_type', [
  'booking_payment',
  'platform_commission',
  'platform_fee',
  'driver_earning',
  'driver_payout',
  'refund',
  'partial_refund',
  'cancellation_charge',
  'commission_reversal',
  'driver_earning_reversal',
  'adjustment',
  'admin_credit',
  'admin_debit',
])
// memo = informational entry that records a fact (e.g. a cancellation charge kept) without moving money.
export const txnDirection = pgEnum('txn_direction', ['credit', 'debit', 'memo'])
export const txnStatus = pgEnum('txn_status', ['pending', 'available', 'paid', 'processing', 'completed', 'failed'])
export const documentType = pgEnum('document_type', ['profile_photo', 'driving_licence', 'vehicle_rc', 'vehicle_photo', 'other'])
export const notificationChannel = pgEnum('notification_channel', ['in_app', 'email', 'sms', 'whatsapp', 'push'])
export const complaintStatus = pgEnum('complaint_status', ['open', 'in_review', 'resolved', 'closed'])
export const complaintCategory = pgEnum('complaint_category', ['driver', 'vehicle', 'booking', 'payment', 'other'])
export const reviewStatus = pgEnum('review_status', ['published', 'hidden'])

export const bookingCodeSeq = pgSequence('booking_code_seq', { startWith: 124, increment: 1 })

// ── People ───────────────────────────────────────────────────────────────────
export const users = pgTable(
  'users',
  {
    id: id(),
    identityId: text('identity_id').unique(),
    email: text('email').unique(),
    name: text('name').notNull().default(''),
    phone: text('phone'),
    role: userRole('role').notNull().default('customer'),
    status: accountStatus('status').notNull().default('active'),
    statusReason: text('status_reason'),
    isDemo: boolean('is_demo').notNull().default(false),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('users_role_idx').on(t.role), index('users_status_idx').on(t.status), index('users_created_at_idx').on(t.createdAt)],
)

export const driverProfiles = pgTable(
  'driver_profiles',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id),
    displayName: text('display_name').notNull(),
    phone: text('phone'),
    licenceNumber: text('licence_number'),
    licenceExpiry: date('licence_expiry', { mode: 'string' }),
    emergencyContact: text('emergency_contact'),
    verification: verificationStatus('verification').notNull().default('pending'),
    verificationNote: text('verification_note'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: uuid('verified_by').references(() => users.id),
    rating: real('rating').notNull().default(0),
    ratingCount: integer('rating_count').notNull().default(0),
    completedTrips: integer('completed_trips').notNull().default(0),
    payoutMethod: payoutMethod('payout_method'),
    payoutUpi: text('payout_upi'),
    payoutAccountName: text('payout_account_name'),
    payoutAccountNumber: text('payout_account_number'),
    payoutIfsc: text('payout_ifsc'),
    providerFundAccountId: text('provider_fund_account_id'),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('driver_profiles_verification_idx').on(t.verification), index('driver_profiles_created_at_idx').on(t.createdAt)],
)

export const driverDocuments = pgTable(
  'driver_documents',
  {
    id: id(),
    driverId: uuid('driver_id')
      .notNull()
      .references(() => driverProfiles.id),
    type: documentType('type').notNull(),
    blobKey: text('blob_key').notNull(),
    fileName: text('file_name').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('driver_documents_driver_idx').on(t.driverId)],
)

export const vehicles = pgTable(
  'vehicles',
  {
    id: id(),
    driverId: uuid('driver_id')
      .notNull()
      .references(() => driverProfiles.id),
    type: text('type').notNull(),
    model: text('model').notNull(),
    registrationNumber: text('registration_number').notNull().unique(),
    passengerSeats: integer('passenger_seats').notNull(),
    photoUrl: text('photo_url'),
    status: recordStatus('status').notNull().default('active'),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('vehicles_driver_idx').on(t.driverId), check('vehicles_seats_chk', sql`${t.passengerSeats} between 1 and 60`)],
)

// ── Routes & trips ───────────────────────────────────────────────────────────
export const routes = pgTable('routes', {
  id: id(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const routeStops = pgTable(
  'route_stops',
  {
    id: id(),
    routeId: uuid('route_id')
      .notNull()
      .references(() => routes.id),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    position: integer('position').notNull(),
    offsetMinutes: integer('offset_minutes').notNull().default(0),
    distanceKm: integer('distance_km').notNull().default(0),
    lat: real('lat'),
    lng: real('lng'),
    pickupPoints: jsonb('pickup_points').$type<string[]>().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('route_stops_route_slug_uq').on(t.routeId, t.slug), index('route_stops_slug_idx').on(t.slug)],
)

export const trips = pgTable(
  'trips',
  {
    id: id(),
    routeId: uuid('route_id')
      .notNull()
      .references(() => routes.id),
    driverId: uuid('driver_id')
      .notNull()
      .references(() => driverProfiles.id),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id),
    date: date('date', { mode: 'string' }).notNull(),
    departureTime: text('departure_time').notNull(),
    departsAt: timestamp('departs_at', { withTimezone: true }).notNull(),
    totalSeats: integer('total_seats').notNull(),
    bookedSeats: integer('booked_seats').notNull().default(0),
    pricePerSeat: integer('price_per_seat').notNull(),
    status: tripStatus('status').notNull().default('booking_open'),
    isReturn: boolean('is_return').notNull().default(false),
    isDemo: boolean('is_demo').notNull().default(false),
    seedKey: text('seed_key').unique(),
    cancelReason: text('cancel_reason'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('trips_driver_idx').on(t.driverId),
    index('trips_route_idx').on(t.routeId),
    index('trips_status_idx').on(t.status),
    index('trips_departs_at_idx').on(t.departsAt),
    index('trips_created_at_idx').on(t.createdAt),
    check('trips_seats_chk', sql`${t.totalSeats} > 0 and ${t.bookedSeats} >= 0 and ${t.bookedSeats} <= ${t.totalSeats}`),
    check('trips_price_chk', sql`${t.pricePerSeat} >= 0`),
  ],
)

export const tripStops = pgTable(
  'trip_stops',
  {
    id: id(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id),
    routeStopId: uuid('route_stop_id')
      .notNull()
      .references(() => routeStops.id),
    position: integer('position').notNull(),
    eta: text('eta').notNull(),
    pickupPoints: jsonb('pickup_points').$type<string[]>().notNull().default([]),
  },
  (t) => [uniqueIndex('trip_stops_trip_position_uq').on(t.tripId, t.position), index('trip_stops_trip_idx').on(t.tripId)],
)

// ── Bookings ─────────────────────────────────────────────────────────────────
export type PassengerRecord = { name: string; age: string; gender: '' | 'female' | 'male' | 'other' }

export const bookings = pgTable(
  'bookings',
  {
    id: id(),
    code: text('code').notNull().unique(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    pickupStopId: uuid('pickup_stop_id')
      .notNull()
      .references(() => routeStops.id),
    dropStopId: uuid('drop_stop_id')
      .notNull()
      .references(() => routeStops.id),
    pickupPoint: text('pickup_point').notNull(),
    seats: integer('seats').notNull(),
    passengers: jsonb('passengers').$type<PassengerRecord[]>().notNull(),
    contactPhone: text('contact_phone').notNull(),
    // Quote calculated by the server when the booking was created (paise).
    pricePerSeat: integer('price_per_seat').notNull(),
    subtotal: integer('subtotal').notNull(),
    platformFee: integer('platform_fee').notNull(),
    totalAmount: integer('total_amount').notNull(),
    currency: text('currency').notNull().default('INR'),
    status: bookingStatus('status').notNull().default('pending_payment'),
    mode: financialMode('mode').notNull(),
    holdExpiresAt: timestamp('hold_expires_at', { withTimezone: true }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelReason: text('cancel_reason'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('bookings_trip_idx').on(t.tripId),
    index('bookings_customer_idx').on(t.customerId),
    index('bookings_status_idx').on(t.status),
    index('bookings_created_at_idx').on(t.createdAt),
    index('bookings_mode_idx').on(t.mode),
    check('bookings_seats_chk', sql`${t.seats} > 0`),
    check('bookings_amounts_chk', sql`${t.subtotal} >= 0 and ${t.platformFee} >= 0 and ${t.totalAmount} = ${t.subtotal} + ${t.platformFee}`),
  ],
)

/**
 * Booking financial snapshot — exactly one per paid booking (unique booking_id).
 * Stores the commission rate in force at payment time so later setting changes
 * never alter historical bookings.
 */
export const commissions = pgTable(
  'commissions',
  {
    id: id(),
    bookingId: uuid('booking_id')
      .notNull()
      .unique()
      .references(() => bookings.id),
    paymentId: uuid('payment_id')
      .notNull()
      .unique()
      .references(() => payments.id),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id),
    driverId: uuid('driver_id')
      .notNull()
      .references(() => driverProfiles.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    mode: financialMode('mode').notNull(),
    seats: integer('seats').notNull(),
    pricePerSeat: integer('price_per_seat').notNull(),
    bookingAmount: integer('booking_amount').notNull(),
    platformFee: integer('platform_fee').notNull(),
    totalPaid: integer('total_paid').notNull(),
    commissionRate: numeric('commission_rate', { precision: 5, scale: 2 }).notNull(),
    commissionAmount: integer('commission_amount').notNull(),
    driverEarning: integer('driver_earning').notNull(),
    currency: text('currency').notNull().default('INR'),
    settingsId: uuid('settings_id').references(() => financialSettings.id),
    createdAt: createdAt(),
  },
  (t) => [
    index('commissions_driver_idx').on(t.driverId),
    index('commissions_trip_idx').on(t.tripId),
    index('commissions_created_at_idx').on(t.createdAt),
    check('commissions_split_chk', sql`${t.bookingAmount} = ${t.commissionAmount} + ${t.driverEarning}`),
    check('commissions_total_chk', sql`${t.totalPaid} = ${t.bookingAmount} + ${t.platformFee}`),
    check('commissions_nonneg_chk', sql`${t.commissionAmount} >= 0 and ${t.driverEarning} >= 0 and ${t.platformFee} >= 0`),
    check('commissions_rate_chk', sql`${t.commissionRate} >= 0 and ${t.commissionRate} <= 100`),
  ],
)

// ── Payments ─────────────────────────────────────────────────────────────────
export const payments = pgTable(
  'payments',
  {
    id: id(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    provider: text('provider').notNull(), // 'razorpay' | 'simulator'
    mode: financialMode('mode').notNull(),
    orderId: text('order_id').notNull().unique(),
    providerPaymentId: text('provider_payment_id').unique(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('INR'),
    method: text('method'),
    status: paymentStatus('status').notNull().default('created'),
    failureReason: text('failure_reason'),
    gatewayReference: text('gateway_reference'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('payments_booking_idx').on(t.bookingId),
    index('payments_customer_idx').on(t.customerId),
    index('payments_status_idx').on(t.status),
    index('payments_created_at_idx').on(t.createdAt),
    // A booking can have many attempts but only one successful (captured) payment.
    uniqueIndex('payments_one_paid_per_booking_uq')
      .on(t.bookingId)
      .where(sql`status in ('paid', 'refund_pending', 'partially_refunded', 'refunded')`),
    check('payments_amount_chk', sql`${t.amount} > 0`),
  ],
)

export const paymentEvents = pgTable(
  'payment_events',
  {
    id: id(),
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull().unique(),
    eventType: text('event_type').notNull(),
    paymentId: uuid('payment_id').references(() => payments.id),
    orderId: text('order_id'),
    providerPaymentId: text('provider_payment_id'),
    payload: jsonb('payload'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    processingResult: text('processing_result'),
    createdAt: createdAt(),
  },
  (t) => [index('payment_events_payment_idx').on(t.paymentId), index('payment_events_created_at_idx').on(t.createdAt)],
)

export const refunds = pgTable(
  'refunds',
  {
    id: id(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    mode: financialMode('mode').notNull(),
    amount: integer('amount').notNull(),
    commissionReversal: integer('commission_reversal').notNull().default(0),
    driverReversal: integer('driver_reversal').notNull().default(0),
    feeReversal: integer('fee_reversal').notNull().default(0),
    cancellationCharge: integer('cancellation_charge').notNull().default(0),
    currency: text('currency').notNull().default('INR'),
    reason: text('reason').notNull(),
    policy: jsonb('policy').$type<Record<string, unknown>>(),
    status: refundStatus('status').notNull().default('requested'),
    providerRefundId: text('provider_refund_id').unique(),
    requestedBy: uuid('requested_by').references(() => users.id),
    decidedBy: uuid('decided_by').references(() => users.id),
    rejectionReason: text('rejection_reason'),
    failureReason: text('failure_reason'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('refunds_booking_idx').on(t.bookingId),
    index('refunds_payment_idx').on(t.paymentId),
    index('refunds_status_idx').on(t.status),
    index('refunds_created_at_idx').on(t.createdAt),
    check('refunds_amount_chk', sql`${t.amount} > 0`),
    check('refunds_split_chk', sql`${t.amount} = ${t.commissionReversal} + ${t.driverReversal} + ${t.feeReversal}`),
  ],
)

// ── Wallets, ledger & payouts ────────────────────────────────────────────────
/** One accounting wallet per driver per mode. Balances are always derived from wallet_transactions. */
export const wallets = pgTable(
  'wallets',
  {
    id: id(),
    driverId: uuid('driver_id')
      .notNull()
      .references(() => driverProfiles.id),
    mode: financialMode('mode').notNull(),
    currency: text('currency').notNull().default('INR'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('wallets_driver_mode_uq').on(t.driverId, t.mode)],
)

export const payouts = pgTable(
  'payouts',
  {
    id: id(),
    driverId: uuid('driver_id')
      .notNull()
      .references(() => driverProfiles.id),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id),
    mode: financialMode('mode').notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('INR'),
    method: payoutMethod('method').notNull(),
    destination: jsonb('destination').$type<Record<string, string>>(),
    status: payoutStatus('status').notNull().default('pending'),
    provider: text('provider').notNull().default('manual'),
    providerPayoutId: text('provider_payout_id').unique(),
    reference: text('reference'),
    notes: text('notes'),
    requestedByDriver: boolean('requested_by_driver').notNull().default(false),
    createdBy: uuid('created_by').references(() => users.id),
    decidedBy: uuid('decided_by').references(() => users.id),
    failureReason: text('failure_reason'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('payouts_driver_idx').on(t.driverId),
    index('payouts_status_idx').on(t.status),
    index('payouts_created_at_idx').on(t.createdAt),
    check('payouts_amount_chk', sql`${t.amount} > 0`),
  ],
)

/**
 * Immutable transaction ledger. Every financial event writes rows here; corrections are
 * new reversal/adjustment rows. `idempotency_key` makes every event write-once, so a
 * retried request or duplicate webhook can never double-count.
 */
export const walletTransactions = pgTable(
  'wallet_transactions',
  {
    id: id(),
    mode: financialMode('mode').notNull(),
    type: txnType('type').notNull(),
    direction: txnDirection('direction').notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('INR'),
    status: txnStatus('status').notNull(),
    walletId: uuid('wallet_id').references(() => wallets.id),
    bookingId: uuid('booking_id').references(() => bookings.id),
    paymentId: uuid('payment_id').references(() => payments.id),
    refundId: uuid('refund_id').references(() => refunds.id),
    payoutId: uuid('payout_id').references(() => payouts.id),
    userId: uuid('user_id').references(() => users.id),
    driverId: uuid('driver_id').references(() => driverProfiles.id),
    reverses: uuid('reverses'),
    referenceId: text('reference_id'),
    description: text('description').notNull(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('wallet_txn_booking_idx').on(t.bookingId),
    index('wallet_txn_driver_idx').on(t.driverId),
    index('wallet_txn_wallet_idx').on(t.walletId),
    index('wallet_txn_user_idx').on(t.userId),
    index('wallet_txn_payment_idx').on(t.paymentId),
    index('wallet_txn_type_idx').on(t.type),
    index('wallet_txn_status_idx').on(t.status),
    index('wallet_txn_created_at_idx').on(t.createdAt),
    check('wallet_txn_amount_chk', sql`${t.amount} > 0`),
  ],
)

// ── Settings, audit & comms ──────────────────────────────────────────────────
/** Versioned: every change inserts a new row; the newest row is in force. */
export const financialSettings = pgTable(
  'financial_settings',
  {
    id: id(),
    commissionRate: numeric('commission_rate', { precision: 5, scale: 2 }).notNull(),
    bookingFee: integer('booking_fee').notNull(),
    currency: text('currency').notNull().default('INR'),
    payoutMode: text('payout_mode').notNull().default('manual'),
    freeCancellationHours: integer('free_cancellation_hours').notNull(),
    lateRefundPercent: integer('late_refund_percent').notNull(),
    noRefundHours: integer('no_refund_hours').notNull(),
    cancellationFee: integer('cancellation_fee').notNull().default(0),
    bookingFeeRefundable: boolean('booking_fee_refundable').notNull().default(false),
    driverCancelRefundPercent: integer('driver_cancel_refund_percent').notNull().default(100),
    driverCancelPenalty: integer('driver_cancel_penalty').notNull().default(0),
    refundApproval: text('refund_approval').notNull().default('automatic'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    index('financial_settings_created_at_idx').on(t.createdAt),
    check('fs_commission_chk', sql`${t.commissionRate} >= 0 and ${t.commissionRate} <= 100`),
    check(
      'fs_nonneg_chk',
      sql`${t.bookingFee} >= 0 and ${t.cancellationFee} >= 0 and ${t.driverCancelPenalty} >= 0 and ${t.freeCancellationHours} >= 0 and ${t.noRefundHours} >= 0`,
    ),
    check('fs_percent_chk', sql`${t.lateRefundPercent} between 0 and 100 and ${t.driverCancelRefundPercent} between 0 and 100`),
    check('fs_window_chk', sql`${t.noRefundHours} <= ${t.freeCancellationHours}`),
  ],
)

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    actorId: uuid('actor_id').references(() => users.id),
    actorEmail: text('actor_email'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    previous: jsonb('previous'),
    next: jsonb('next'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_logs_actor_idx').on(t.actorId),
    index('audit_logs_entity_idx').on(t.entityType, t.entityId),
    index('audit_logs_created_at_idx').on(t.createdAt),
  ],
)

export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    bookingId: uuid('booking_id').references(() => bookings.id),
    channel: notificationChannel('channel').notNull().default('in_app'),
    deliveryStatus: text('delivery_status').notNull().default('delivered'),
    dedupeKey: text('dedupe_key').unique(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('notifications_user_idx').on(t.userId), index('notifications_created_at_idx').on(t.createdAt)],
)

export const reviews = pgTable(
  'reviews',
  {
    id: id(),
    bookingId: uuid('booking_id')
      .notNull()
      .unique()
      .references(() => bookings.id),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id),
    driverId: uuid('driver_id')
      .notNull()
      .references(() => driverProfiles.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    status: reviewStatus('status').notNull().default('published'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('reviews_driver_idx').on(t.driverId),
    index('reviews_created_at_idx').on(t.createdAt),
    check('reviews_rating_chk', sql`${t.rating} between 1 and 5`),
  ],
)

export const complaints = pgTable(
  'complaints',
  {
    id: id(),
    bookingId: uuid('booking_id').references(() => bookings.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    driverId: uuid('driver_id').references(() => driverProfiles.id),
    category: complaintCategory('category').notNull(),
    subject: text('subject').notNull(),
    description: text('description').notNull(),
    status: complaintStatus('status').notNull().default('open'),
    resolutionNote: text('resolution_note'),
    resolvedBy: uuid('resolved_by').references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('complaints_customer_idx').on(t.customerId),
    index('complaints_status_idx').on(t.status),
    index('complaints_created_at_idx').on(t.createdAt),
  ],
)
