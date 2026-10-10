import { CircleMarker, Tooltip } from 'react-leaflet'
import type { Stop } from '../types/Stop'

interface StopMarkerProps {
  stop: Stop
  selected: boolean
  onTap: (stop: Stop) => void
}

/** A transportation stop or terminal on the map. Tap it to see the routes that leave from it. */
export default function StopMarker({ stop, selected, onTap }: StopMarkerProps) {
  return (
    <CircleMarker
      center={[stop.latitude, stop.longitude]}
      radius={selected ? 10 : 7}
      // bubblingMouseEvents: false = this click is not ALSO treated as a tap on the road below
      pathOptions={{
        color: '#0f172a',
        weight: 2,
        fillColor: selected ? '#2563eb' : '#ffffff',
        fillOpacity: 1,
        bubblingMouseEvents: false,
      }}
      eventHandlers={{ click: () => onTap(stop) }}
    >
      <Tooltip>{stop.name}</Tooltip>
    </CircleMarker>
  )
}