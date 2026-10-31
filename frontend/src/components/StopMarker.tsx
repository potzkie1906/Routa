import { CircleMarker, Marker, Tooltip } from 'react-leaflet'
import type { Stop } from '../types/Stop'
import {isTerminal} from '../utils/stops'
import { selectedTerminalPin, terminalPin } from './terminalIcon'
import { BRAND_COLORS } from '../utils/brandColors'

interface StopMarkerProps {
  stop: Stop
  selected: boolean
  onTap: (stop: Stop) => void
}

/**
 * A transportation stop or terminal on the map. Tap it to see the routes that leave from it.
  * A terminal is a glowing green pin with a bus symbol. Its name shows next to it on hover, on a tap,
 * or when the pin has keyboard focus.
 */
export default function StopMarker({ stop, selected, onTap }: StopMarkerProps) {
  if (isTerminal(stop)) {
    return (
      <Marker
        position={[stop.latitude, stop.longitude]}
        icon={selected ? selectedTerminalPin : terminalPin}
        zIndexOffset={selected ? 1000 : 500} // terminals above ordinary stops
        title={stop.name}
        // a Marker click never reaches the map below, so it is not ALSO a tap on the road
        eventHandlers={{ click: () => onTap(stop) }}
      >
        {/* not "permanent": the name shows only on hover (or a tap), so labels never cover the map */}
        <Tooltip direction="right" offset={[10, 0]} className="th-terminal-label">
          {stop.name}
        </Tooltip>
      </Marker>
    )
  }

  return (
    <CircleMarker
      center={[stop.latitude, stop.longitude]}
      radius={selected ? 10 : 7}
      // bubblingMouseEvents: false = this click is not ALSO treated as a tap on the road below
      pathOptions={{
        color: BRAND_COLORS.primary,
        weight: 2,
        fillColor: selected ? BRAND_COLORS.primary : '#ffffff',
        fillOpacity: 1,
        bubblingMouseEvents: false,
      }}
      eventHandlers={{ click: () => onTap(stop) }}
    >
      <Tooltip>{stop.name}</Tooltip>
    </CircleMarker>
  )
}