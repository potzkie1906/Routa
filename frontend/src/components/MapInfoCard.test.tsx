import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { makeRoute } from '../test/fixtures'
import type { TapInfo } from '../utils/mapTap'
import { tripsFromStop } from '../utils/mapTap'
import MapInfoCard from './MapInfoCard'

// a tap on "Alpha Terminal", the first stop of the test route "Test Line"
const route = makeRoute()
const info: TapInfo = { kind: 'stop', stop: route.stops[0].stop, trips: tripsFromStop(1, [route]) }

function renderCard(folded: boolean, onToggleFold = () => {}) {
  render(
    // the card has a link, and a link needs a router around it
    <MemoryRouter>
      <MapInfoCard
        info={info}
        folded={folded}
        onToggleFold={onToggleFold}
        onClose={() => {}}
        selectedRouteId={null}
        onShowRoute={() => {}}
      />
    </MemoryRouter>,
  )
}

describe('MapInfoCard', () => {
  it('lists the routes when it is open', () => {
    renderCard(false)
    expect(screen.getByRole('button', { name: /Test Line/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Alpha Terminal/ }).getAttribute('aria-expanded')).toBe('true')
  })
  it('shows only its header when folded', () => {
    renderCard(true)
    expect(screen.queryByRole('button', { name: /Test Line/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Alpha Terminal/ }).getAttribute('aria-expanded')).toBe('false')
  })
  it('asks to fold or open when the header is tapped', () => {
    const onToggleFold = vi.fn()
    renderCard(false, onToggleFold)
    fireEvent.click(screen.getByRole('button', { name: /Alpha Terminal/ }))
    expect(onToggleFold).toHaveBeenCalledTimes(1)
  })
})