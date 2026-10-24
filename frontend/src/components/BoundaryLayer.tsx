import { useMemo } from 'react'
import { divIcon } from 'leaflet'
import { Marker, Polygon } from 'react-leaflet'
import type { CityBoundary } from '../utils/boundary'
import { cityLabelSize } from '../utils/boundary'
import { BRAND_COLORS } from '../utils/brandColors'

interface BoundaryLayerProps {
  boundary: CityBoundary
  zoom: number
}

/**
 * The official city outline: a soft wide glow under a sharp blue line, a light blue fill,
 * and the city name written once in the middle. It never catches taps (interactive: false),
 * so a tap inside the city still reaches the roads and stops.
 */
export default function BoundaryLayer({ boundary, zoom }: BoundaryLayerProps) {
  const size = cityLabelSize(zoom)

  // the city name is a small piece of HTML placed on the map (a "div icon")
  const labelIcon = useMemo(
    () =>
      divIcon({
        className: '',
        // fainter when zoomed in close, so it never hides stops or streets
        html: `<div class="th-city-label${zoom >= 15 ? ' th-city-label--faint' : ''}" style="font-size:${size}px">${boundary.name.toUpperCase()}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      }),
    [boundary.name, size, zoom],
  )

  return (
    <>
      <Polygon
        positions={boundary.polygons}
        interactive={false}
        pathOptions={{ className: 'th-boundary-glow', color: BRAND_COLORS.secondary, weight: 8, opacity: 0.25, fill: false }}
      />
      <Polygon
        positions={boundary.polygons}
        interactive={false}
        pathOptions={{ color: BRAND_COLORS.primary, weight: 2.5, opacity: 0.95, fillColor: BRAND_COLORS.secondary, fillOpacity: 0.08 }}
      />
      {size > 0 && (
        <Marker position={boundary.labelPoint} icon={labelIcon} interactive={false} keyboard={false} zIndexOffset={-1000} />
      )}
    </>
  )
}