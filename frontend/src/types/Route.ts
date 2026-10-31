import type { Stop } from './Stop'
import type { Transportation } from './Transportation'

// Matches RouteResponse in docs/API.md.
export type RouteStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export interface Coordinate {
  latitude: number
  longitude: number
}

export interface FareRule {
  baseFare: number
  perKmRate: number
}

export interface Schedule {
  firstTrip: string // "05:00:00"
  lastTrip: string
  frequencyMinutes: number
  daysOperating: string
}

export interface RouteStop {
  stopOrder: number
  minutesFromStart: number
  stop: Stop
}

export interface Route {
  id: number
  routeCode: string
  routeName: string
  origin: string
  destination: string
  status: RouteStatus // set by an admin
  currentStatus: RouteStatus // right now, from the operating hours (shown to riders)
  estimatedMinutes: number
  distanceKm: number
  demoData: boolean
  transportation: Transportation
  estimatedFare: number | null
  fareRule: FareRule | null
  stops: RouteStop[]
  path: Coordinate[]
  schedules: Schedule[]
}
