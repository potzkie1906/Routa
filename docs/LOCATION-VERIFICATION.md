# Location verification: Batangas City terminals

Scope: **only the terminals inside Batangas City**. Stops in Lipa, Malvar, Tanauan, Ibaan and other towns
were not re-checked and keep their approximate demo positions (`location_verified = FALSE`).

## How the terminals were found

1. Every place that stores coordinates was searched: `database/seed/sample-data.sql` (stops and route
   lines), `database/migrations/`, the road tool output, backend code and tests, and frontend code.
   The frontend never stores terminal coordinates; it only shows what the API returns.
2. Every stop was tested against the official Batangas City boundary (see below).

| Stop | Inside Batangas City? |
|---|---|
| Lipa City Grand Terminal | No (Lipa City) |
| Lipa Public Market | No (Lipa City) |
| SM City Lipa | No (Lipa City) |
| Malvar Junction | No (Malvar) |
| Tanauan Terminal | No (Tanauan City) |
| Ibaan Junction | No (Ibaan) |
| **Batangas Grand Terminal** | **Yes** |
| Tambo Barangay Hall | No (Lipa City) |

TransitHub has **one** Batangas City terminal. No terminal was added: the map lists only what the data contains.

## Verification report

| Terminal | Old coordinates | New verified coordinates | Address | Verification source | Status |
|---|---|---|---|---|---|
| Batangas Grand Terminal | 13.762, 121.059 | **13.790168, 121.061538** | Diversion Road, Alangilan, Batangas City | Coordinates provided by the project owner as verified; cross-checked against the OpenStreetMap bus stop "Batangas City Grand Terminal" (node 6836374622, 13.78941, 121.06301), 180 m away on Diversion Road; address confirmed by public listings (Waze place "Batangas City Grand Terminal, Batangas Diversion Rd", 12Go station "Grand Terminal, Diversion Road"); inside the official city boundary | **Fixed** |

Notes:
- The old demo position was about **3.1 km** south of the real terminal.
- The OpenStreetMap point is the **bus stop on the road**; the verified coordinate is the **terminal itself**,
  next to the road. A difference of about 180 m between the two is expected, so both sources agree.
- Re-check the coordinate yourself before a demo: open
  <https://www.openstreetmap.org/?mlat=13.790168&mlon=121.061538#map=18/13.790168/121.061538> and confirm the
  pin sits on the terminal building.

## One source of truth

```
stops table (latitude, longitude, location_verified)   <- the only place the coordinate is stored
        |  GET /api/stops, GET /api/routes (StopResponse)
        v
frontend: findCityTerminals() combines the stops with the city boundary
        v
Leaflet: terminal marker, label, popup, route lines
```

- `stops.location_verified` is `TRUE` only for checked coordinates. Moving a stop in the admin screen sets it
  back to `FALSE` (`Stop.moveTo`), because new coordinates have not been checked.
- The road tool (`database/tools/snap-routes-to-roads.mjs`) never moves a verified stop.
- Test coverage: `TerminalLocationTest` (database), `StopLocationTest` (unit),
  `utils/boundary.test.ts` and `utils/terminals.test.ts` (frontend).

## Route lines through the terminal

The routes LB-JEEP-01, LB-BUS-01, BT-BUS-01 and BL-VAN-01 start or end at the terminal. Their stored lines are
**straight segments between stops** (the demo data never stored real roads). Migration 002 rebuilt them through
the corrected terminal, and a guessed waypoint on LB-BUS-01 was removed. The map draws such lines **dotted** and
labels them "approximate line (not the road)".

To get lines that follow the roads, run the road tool (`database/tools/README.md`). It routes with OSRM on
OpenStreetMap data, keeps the verified terminal where it is, and the dotted style disappears automatically
because the new lines have points along the roads.

## Batangas City boundary

| | |
|---|---|
| File | `frontend/public/data/batangas-city-boundary.geojson` (37 KB, 2 polygons: the main city area and Verde Island) |
| Data | PSA Philippine Standard Geographic Code (PSGC) administrative boundaries as of 31 December 2023 |
| PSGC code | 0401005000 (Batangas City, Batangas) |
| Taken from | github.com/faeldon/philippines-json-maps, commit 8eeead5, file `2023/geojson/provdists/hires/municities-provdist-401000000.0.1.json` |
| License | MIT, copied next to the file (`batangas-city-boundary.LICENSE.txt`) |
| Changes | Only Batangas City kept; coordinates rounded to 6 decimals (about 10 cm) |

The outline was not drawn by hand. The file is loaded once by `hooks/useCityBoundary.ts` and drawn with
Leaflet polygons in `components/map/BoundaryLayer.tsx`.
