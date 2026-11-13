// ⚠️ DEMO DATA — every record here is a stub for the product preview.
// A later milestone replaces this module with Netlify Database queries
// (see PLAN.md). Keep all stub data in this one file.
import type { Driver, PlatformSettings, Route, Trip, TripStop, Vehicle } from '@/lib/types'

export const ddnKpgRoute: Route = {
  id: 'route-ddn-kpg',
  name: 'Dehradun – Karnaprayag',
  stops: [
    { id: 'dehradun', name: 'Dehradun', order: 0, offsetMinutes: 0, distanceKm: 0, location: { lat: 30.3165, lng: 78.0322 }, pickupPoints: ['ISBT Dehradun', 'Clock Tower (Ghanta Ghar)', 'Railway Station'] },
    { id: 'rishikesh', name: 'Rishikesh', order: 1, offsetMinutes: 75, distanceKm: 45, location: { lat: 30.0869, lng: 78.2676 }, pickupPoints: ['Natraj Chowk', 'Rishikesh Bus Stand'] },
    { id: 'devprayag', name: 'Devprayag', order: 2, offsetMinutes: 200, distanceKm: 115, location: { lat: 30.1461, lng: 78.598 }, pickupPoints: ['Devprayag Bus Stand', 'Sangam Market'] },
    { id: 'srinagar', name: 'Srinagar', order: 3, offsetMinutes: 255, distanceKm: 150, location: { lat: 30.2238, lng: 78.7842 }, pickupPoints: ['Srinagar Bus Stand', 'HNB University Gate'] },
    { id: 'rudraprayag', name: 'Rudraprayag', order: 4, offsetMinutes: 320, distanceKm: 185, location: { lat: 30.2844, lng: 78.9811 }, pickupPoints: ['Gulabrai', 'Rudraprayag Main Market'] },
    { id: 'karnaprayag', name: 'Karnaprayag', order: 5, offsetMinutes: 400, distanceKm: 215, location: { lat: 30.2634, lng: 79.2179 }, pickupPoints: ['Karnaprayag Bus Stand', 'Sangam Bridge'] },
  ],
}

export const routes: Route[] = [ddnKpgRoute]

export const drivers: Driver[] = [
  { id: 'drv-rajesh', name: 'Rajesh Negi', rating: 4.8, ratingCount: 126, completedTrips: 214, verification: 'verified', memberSince: '2025-03', isDemo: true },
  { id: 'drv-pooja', name: 'Pooja Bisht', rating: 4.9, ratingCount: 88, completedTrips: 131, verification: 'verified', memberSince: '2025-06', isDemo: true },
  { id: 'drv-mohan', name: 'Mohan Semwal', rating: 4.6, ratingCount: 203, completedTrips: 340, verification: 'verified', memberSince: '2024-11', isDemo: true },
  { id: 'drv-sunil', name: 'Sunil Rawat', rating: 4.7, ratingCount: 64, completedTrips: 92, verification: 'verified', memberSince: '2025-08', isDemo: true },
  { id: 'drv-deepak', name: 'Deepak Bhandari', rating: 4.5, ratingCount: 41, completedTrips: 57, verification: 'verified', memberSince: '2026-01', isDemo: true },
]

export const vehicles: Vehicle[] = [
  { id: 'veh-1', driverId: 'drv-rajesh', type: 'Bolero', model: 'Mahindra Bolero Neo', registrationNumber: 'UK07 TA 4521', passengerSeats: 6 },
  { id: 'veh-2', driverId: 'drv-pooja', type: 'Ertiga', model: 'Maruti Suzuki Ertiga', registrationNumber: 'UK07 TB 8834', passengerSeats: 6 },
  { id: 'veh-3', driverId: 'drv-mohan', type: 'Tempo Traveller', model: 'Force Traveller 12-seater', registrationNumber: 'UK08 PA 1190', passengerSeats: 12 },
  { id: 'veh-4', driverId: 'drv-sunil', type: 'Scorpio', model: 'Mahindra Scorpio N', registrationNumber: 'UK13 TA 2210', passengerSeats: 6 },
  { id: 'veh-5', driverId: 'drv-deepak', type: 'Innova', model: 'Toyota Innova Crysta', registrationNumber: 'UK11 TA 3307', passengerSeats: 6 },
]

export const platformSettings: PlatformSettings = {
  bookingFee: 20,
  commissionPercent: 10,
  paymentGatewayConfigured: false,
  cancellationRules: [
    { minHoursBefore: 24, refundPercent: 100, label: 'More than 24 hours before departure' },
    { minHoursBefore: 6, refundPercent: 75, label: '6 to 24 hours before departure' },
    { minHoursBefore: 0, refundPercent: 0, label: 'Less than 6 hours before departure' },
  ],
}

// Dates are relative to today so the preview always shows upcoming rides.
function dayFromToday(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  const total = (h * 60 + m + minutes) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function buildStops(departure: string, stopIds: string[], reverse = false): TripStop[] {
  const routeStops = ddnKpgRoute.stops.filter((s) => stopIds.includes(s.id))
  const ordered = reverse ? [...routeStops].reverse() : routeStops
  const start = ordered[0].offsetMinutes
  return ordered.map((s, i) => ({
    stopId: s.id,
    name: s.name,
    order: i,
    eta: addMinutes(departure, Math.abs(s.offsetMinutes - start)),
    pickupPoints: s.pickupPoints,
  }))
}

const ALL = ddnKpgRoute.stops.map((s) => s.id)

type TripSeed = Omit<Trip, 'routeId' | 'status' | 'stops' | 'date'> & {
  day: number
  stopIds?: string[]
}

const seeds: TripSeed[] = [
  { id: 'trip-101', day: 0, departureTime: '15:00', driverId: 'drv-mohan', vehicleId: 'veh-3', totalSeats: 12, bookedSeats: 7, pricePerSeat: 450, isReturn: false, stopIds: ['dehradun', 'rishikesh', 'devprayag', 'srinagar'] },
  { id: 'trip-102', day: 1, departureTime: '06:00', driverId: 'drv-rajesh', vehicleId: 'veh-1', totalSeats: 6, bookedSeats: 2, pricePerSeat: 650, isReturn: false },
  { id: 'trip-103', day: 1, departureTime: '07:30', driverId: 'drv-pooja', vehicleId: 'veh-2', totalSeats: 6, bookedSeats: 5, pricePerSeat: 700, isReturn: false },
  { id: 'trip-104', day: 1, departureTime: '13:00', driverId: 'drv-mohan', vehicleId: 'veh-3', totalSeats: 12, bookedSeats: 4, pricePerSeat: 550, isReturn: false },
  { id: 'trip-105', day: 1, departureTime: '07:00', driverId: 'drv-sunil', vehicleId: 'veh-4', totalSeats: 6, bookedSeats: 3, pricePerSeat: 650, isReturn: true },
  { id: 'trip-106', day: 2, departureTime: '05:30', driverId: 'drv-sunil', vehicleId: 'veh-4', totalSeats: 6, bookedSeats: 6, pricePerSeat: 650, isReturn: false },
  { id: 'trip-107', day: 2, departureTime: '08:00', driverId: 'drv-deepak', vehicleId: 'veh-5', totalSeats: 6, bookedSeats: 1, pricePerSeat: 800, isReturn: false },
  { id: 'trip-108', day: 3, departureTime: '06:30', driverId: 'drv-rajesh', vehicleId: 'veh-1', totalSeats: 6, bookedSeats: 0, pricePerSeat: 650, isReturn: true },
  { id: 'trip-109', day: 4, departureTime: '06:00', driverId: 'drv-pooja', vehicleId: 'veh-2', totalSeats: 6, bookedSeats: 0, pricePerSeat: 700, isReturn: false },
]

export const trips: Trip[] = seeds.map(({ day, stopIds = ALL, ...t }) => ({
  ...t,
  routeId: ddnKpgRoute.id,
  date: dayFromToday(day),
  status: t.bookedSeats >= t.totalSeats ? 'fully_booked' : 'booking_open',
  stops: buildStops(t.departureTime, stopIds, t.isReturn),
}))

export const popularRoutes: Array<{ from: string; to: string }> = [
  { from: 'dehradun', to: 'karnaprayag' },
  { from: 'karnaprayag', to: 'dehradun' },
  { from: 'rishikesh', to: 'rudraprayag' },
  { from: 'dehradun', to: 'srinagar' },
  { from: 'srinagar', to: 'karnaprayag' },
]
