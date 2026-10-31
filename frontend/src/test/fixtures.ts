import type { Route, RouteStop } from '../types/Route'

// Small made-up data for tests (not the real sample data).

function stopAt(order: number, id: number, name: string, minutes: number): RouteStop {
  return {
    stopOrder: order,
    minutesFromStart: minutes,
    stop: { id, name, description: null, latitude: 13.9 + id / 100, longitude: 121.1 + id / 100, demoData: true },
  }
}

/** A route with three stops: Alpha (0 min), Beta (10 min), Gamma (25 min). */
export function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: 1,
    routeCode: 'T-01',
    routeName: 'Test Line',
    origin: 'Alpha',
    destination: 'Gamma',
    status: 'ACTIVE',
    currentStatus: 'ACTIVE',
    estimatedMinutes: 25,
    distanceKm: 8.5,
    demoData: true,
    transportation: { id: 3, name: 'Test Bus', code: 'TB', type: 'Bus', description: null, details: { airConditioned: true } },
    estimatedFare: 30,
    fareRule: { baseFare: 13, perKmRate: 2 },
    stops: [stopAt(1, 1, 'Alpha Terminal', 0), stopAt(2, 2, 'Beta Market', 10), stopAt(3, 3, 'Gamma Plaza', 25)],
    path: [
      { latitude: 13.91, longitude: 121.11 },
      { latitude: 13.93, longitude: 121.13 },
    ],
    schedules: [{ firstTrip: '05:00:00', lastTrip: '21:30:00', frequencyMinutes: 15, daysOperating: 'MON-SUN' }],
    ...overrides,
  }
}
