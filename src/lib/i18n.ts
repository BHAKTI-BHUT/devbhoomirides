// All customer-facing copy lives here so Hindi (`hi`) can be added as a second
// dictionary later without touching components.
const en = {
  appName: 'Devbhoomi Rides',
  tagline: 'Shared rides in the hills',
  searchTitle: 'Search a Ride',
  from: 'From',
  to: 'To',
  travelDate: 'Travel Date',
  searchButton: 'Search Ride',
  swap: 'Swap From and To',
  upcomingTrips: 'Upcoming Trips',
  popularRoutes: 'Popular Routes',
  myBookings: 'My Bookings',
  home: 'Home',
  search: 'Search',
  seatsAvailable: 'seats available',
  seatAvailable: 'seat available',
  fullyBooked: 'Fully booked',
  perSeat: 'per seat',
  bookSeat: 'Book Seat',
  viewDetails: 'View Details',
  verifiedDriver: 'Verified driver',
  noRides: 'No rides found for this date',
  otherDates: 'Rides on other dates',
  pickup: 'Pickup',
  drop: 'Drop',
  pickupPoint: 'Pickup point',
  passengers: 'Passengers',
  tripDetails: 'Trip Details',
  passengerDetails: 'Passenger Details',
  fareSummary: 'Fare Summary',
  paymentMethod: 'Payment Method',
  continue: 'Continue',
  back: 'Back',
  payAndBook: 'Pay & Confirm Booking',
  bookingConfirmed: 'Booking Confirmed',
  cancelBooking: 'Cancel Booking',
  contactDriver: 'Contact Driver',
  findRide: 'Find a Ride',
  driveWithUs: 'Drive With Us',
} as const

export type MessageKey = keyof typeof en
const dictionaries = { en } satisfies Record<string, Record<MessageKey, string>>
export type Locale = keyof typeof dictionaries

let locale: Locale = 'en'
export function setLocale(next: Locale) {
  locale = next
}
export function t(key: MessageKey) {
  return dictionaries[locale][key]
}
