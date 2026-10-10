import { describe, expect, it } from 'vitest'
import { makeRoute } from '../test/fixtures'
import { osrmRouteUrl, parseOsrmLine, roadLineOf } from './roadGeometry'

describe('osrmRouteUrl', () => {
  it('lists the stops in order as longitude,latitude', () => {
    expect(osrmRouteUrl(makeRoute(), 'http://osrm.test')).toBe(
      'http://osrm.test/route/v1/driving/121.11,13.91;121.12,13.92;121.13,13.93?overview=full&geometries=geojson',
    )
  })
})

describe('parseOsrmLine', () => {
  it('turns [longitude, latitude] pairs into [latitude, longitude]', () => {
    const answer = { code: 'Ok', routes: [{ geometry: { coordinates: [[121.11, 13.91], [121.115, 13.912], [121.13, 13.93]] } }] }
    expect(parseOsrmLine(answer)).toEqual([[13.91, 121.11], [13.912, 121.115], [13.93, 121.13]])
  })
  it('returns null for errors and odd answers', () => {
    expect(parseOsrmLine({ code: 'NoRoute' })).toBeNull()
    expect(parseOsrmLine({ code: 'Ok', routes: [] })).toBeNull()
    expect(parseOsrmLine({ code: 'Ok', routes: [{ geometry: { coordinates: [[121, 13]] } }] })).toBeNull()
    expect(parseOsrmLine(null)).toBeNull()
  })
})

describe('roadLineOf', () => {
  it('uses the stored line, without a request, when it already follows the roads', async () => {
    const route = makeRoute({
      path: [{ latitude: 13.91, longitude: 121.11 }, { latitude: 13.914, longitude: 121.118 }, { latitude: 13.93, longitude: 121.13 }],
    })
    expect(await roadLineOf(route)).toEqual([[13.91, 121.11], [13.914, 121.118], [13.93, 121.13]])
  })
})