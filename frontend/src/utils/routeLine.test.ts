import { describe, expect, it } from 'vitest'
import { makeRoute } from '../test/fixtures'
import { isApproximateLine } from './routeLine'

describe('isApproximateLine', () => {
  // the fixture route has stops at (13.91, 121.11), (13.92, 121.12), (13.93, 121.13)
  it('is true when the line only joins the stops with straight segments', () => {
    const route = makeRoute({
      path: [
        { latitude: 13.91, longitude: 121.11 },
        { latitude: 13.93, longitude: 121.13 },
      ],
    })
    expect(isApproximateLine(route)).toBe(true)
  })

  it('is false when the line has points along the road between the stops', () => {
    const route = makeRoute({
      path: [
        { latitude: 13.91, longitude: 121.11 },
        { latitude: 13.914, longitude: 121.118 },
        { latitude: 13.93, longitude: 121.13 },
      ],
    })
    expect(isApproximateLine(route)).toBe(false)
  })

  it('is false when there is no line at all', () => {
    expect(isApproximateLine(makeRoute({ path: [] }))).toBe(false)
  })
})