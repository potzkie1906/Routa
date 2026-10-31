import type { TransportTypeName } from '../types/Transportation'
import { colorForType } from '../utils/transportColors'

export interface MapFilterState {
  types: Record<TransportTypeName, boolean>
  showActive: boolean
  showInactive: boolean
}

interface MapFiltersProps {
  filters: MapFilterState
  onChange: (filters: MapFilterState) => void
}

const typeNames: TransportTypeName[] = ['Bus', 'Jeepney', 'Van']

/** Check boxes that decide which routes are drawn on the map. */
export default function MapFilters({ filters, onChange }: MapFiltersProps) {
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <legend className="px-1 text-sm font-semibold">Filters</legend>

      <div className="space-y-2">
        {typeNames.map((type) => (
          <label key={type} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.types[type]}
              onChange={() =>
                onChange({ ...filters, types: { ...filters.types, [type]: !filters.types[type] } })
              }
            />
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colorForType(type) }} />
            {type}
          </label>
        ))}
      </div>

      <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.showActive}
            onChange={() => onChange({ ...filters, showActive: !filters.showActive })}
          />
          Active routes
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.showInactive}
            onChange={() => onChange({ ...filters, showInactive: !filters.showInactive })}
          />
            Inactive routes<span className="text-xs text-slate-500">(gray line, outside operating hours)</span>
        </label>
      </div>
    </fieldset>
  )
}
