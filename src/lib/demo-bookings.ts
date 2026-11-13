// DEMO booking store — keeps bookings made in the preview in localStorage so
// the full flow can be clicked through. Replaced by the server booking API
// (atomic seat updates in Netlify Database) in a later milestone.
import { useSyncExternalStore } from 'react'
import type { Booking } from './types'

const KEY = 'devbhoomi-demo-bookings'
const listeners = new Set<() => void>()
let cache: Booking[] | null = null
const EMPTY: Booking[] = []

function read(): Booking[] {
  if (typeof window === 'undefined') return EMPTY
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    cache = []
  }
  return cache!
}

function write(next: Booking[]) {
  cache = next
  localStorage.setItem(KEY, JSON.stringify(next))
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useDemoBookings() {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}

/** Seats held by active demo bookings on a trip. */
export function demoSeatsBooked(bookings: Booking[], tripId: string) {
  return bookings
    .filter((b) => b.tripId === tripId && (b.status === 'confirmed' || b.status === 'pending'))
    .reduce((n, b) => n + b.seats, 0)
}

export function nextBookingId() {
  const year = new Date().getFullYear()
  const n = 124 + read().length
  return `DR-${year}-${String(n).padStart(6, '0')}`
}

export function addDemoBooking(b: Booking) {
  write([b, ...read()])
}

export function cancelDemoBooking(id: string, refundAmount: number) {
  write(
    read().map((b) =>
      b.id === id
        ? {
            ...b,
            status: 'cancelled_by_customer',
            paymentStatus: refundAmount > 0 ? 'refund_pending' : b.paymentStatus,
            refundAmount,
            cancelledAt: new Date().toISOString(),
          }
        : b,
    ),
  )
}
