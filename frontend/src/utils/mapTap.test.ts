import { describe, expect, it } from 'vitest'
import { makeRoute } from '../test/fixtures'
import { distanceToSegmentM, routesNearPoint, tapToleranceMeters, tripsFromStop } from './mapTap'

// fixture route: Alpha Terminal (13.91, 121.11) -> Beta Market (13.92, 121.12) -> Gamma Plaza (13.93, 121.13)
// at 0, 10 and 25 minutes; its line runs from (13.91, 121.11) to (13.93, 121.13)
const route = makeRoute()

describe('distanceToSegmentM', () => {
  it('is zero on the segment and grows away from it', () => {
    expect(distanceToSegmentM([13.92, 121.12], [13.91, 121.11], [13.93, 121.13])).toBeLessThan(1)
    expect(distanceToSegmentM([13.92, 121.121], [13.91, 121.11], [13.93, 121.13])).toBeGreaterThan(50)
  })
  it('measures to the nearest end when the point is past the segment', () => {
    // 0.001 degree of latitude is about 111 m
    expect(distanceToSegmentM([13.909, 121.11], [13.91, 121.11], [13.93, 121.13])).toBeCloseTo(111.3, 0)
  })
})

describe('routesNearPoint', () => {
  it('finds a route when the tap is on or near its line', () => {
    expect(routesNearPoint([route], 13.92, 121.12, 30).map((m) => m.route.id)).toEqual([1])
  })
  it('finds nothing far from every line', () => {
    expect(routesNearPoint([route], 13.95, 121.10, 30)).toEqual([])
  })
  it('lists the nearest route first', () => {
    const other = makeRoute({ id: 2, path: [{ latitude: 13.9201, longitude: 121.10 }, { latitude: 13.9201, longitude: 121.14 }] })
    const found = routesNearPoint([route, other], 13.9201, 121.1201, 100)
    expect(found.map((m) => m.route.id)).toEqual([2, 1])
  })
})

describe('tripsFromStop', () => {
  it('lists the later stops and the minutes to each', () => {
    const trips = tripsFromStop(2, [route]) // from Beta Market
    expect(trips.length).toBe(1)
    expect(trips[0].destinations.map((d) => [d.stop.name, d.minutes])).toEqual([['Gamma Plaza', 15]])
  })
  it('skips routes where the stop is the last one, and routes that do not stop there', () => {
    expect(tripsFromStop(3, [route])).toEqual([]) // Gamma Plaza is the end of the line
    expect(tripsFromStop(99, [route])).toEqual([])
  })
  it('lists active routes before inactive ones', () => {
    const inactive = makeRoute({ id: 5, routeName: 'A Inactive Line', status: 'INACTIVE' })
    expect(tripsFromStop(1, [inactive, route]).map((t) => t.route.id)).toEqual([1, 5])
  })
})

describe('tapToleranceMeters', () => {
  it('gets smaller as you zoom in', () => {
    expect(tapToleranceMeters(16, 13.8)).toBeLessThan(tapToleranceMeters(12, 13.8))
    expect(tapToleranceMeters(15, 13.8)).toBeCloseTo(65.1, 0) // 14 px at zoom 15 is about 65 m
  })
})