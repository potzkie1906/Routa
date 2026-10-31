# Frontend setup (React + TypeScript + Vite)

Needs Node.js 22 LTS (or at least 20.19). Check with `node -v`.

## First time (one developer creates the project, everyone else just runs npm install)

```bash
# from the project root
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install tailwindcss @tailwindcss/vite react-router axios leaflet react-leaflet
npm install -D @types/leaflet
```

Then add the Tailwind plugin to `frontend/vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite'
// ...
plugins: [react(), tailwindcss()],
```

## Every other developer

```bash
cd frontend
npm install
```

## Run

```bash
cd frontend
npm run dev      # http://localhost:5173
npm run build    # type-checks and builds
npm run lint
```

The backend must be running on <http://localhost:8080>. To use another address, copy
`frontend/.env.example` to `frontend/.env` and change `VITE_API_BASE_URL`.

## Folder structure (`frontend/src`)

| Folder | What goes there |
| --- | --- |
| `components/` | Reusable pieces: Navbar, MapView, RouteCard... |
| `pages/` and `pages/admin/` | One file per screen |
| `services/` | Axios calls to the backend (`api.ts` is the shared client) |
| `context/` | Shared state, for example the logged-in user |
| `hooks/` | Reusable React hooks |
| `types/` | TypeScript interfaces for the API data |
| `utils/` | Small helper functions and constants |

## Pages and who can open them

| URL | Page | Who |
| --- | --- | --- |
| `/` | Home | everyone |
| `/map` | Map | everyone |
| `/routes`, `/routes/:id` | Route list and details | everyone |
| `/alerts` | Alerts | everyone |
| `/login`, `/register` | Log in / sign up | everyone |
| `/favorites`, `/profile` | My favorites, my profile | logged-in users |
| `/admin` and `/admin/routes`, `/stops`, `/transportation`, `/alerts`, `/users` | Admin area | ADMIN only |

The frontend hides pages the user may not open, but that is only for convenience.
The backend checks the login and the role again on every API call.

## How login works in the frontend

1. `Login.tsx` calls `AuthContext.login(...)`, which calls `POST /api/auth/login`.
2. The token is saved in `localStorage` (`utils/tokenStorage.ts`) and the user is kept in React state.
3. `services/api.ts` adds `Authorization: Bearer <token>` to every request.
4. After a page refresh, `AuthProvider` asks `GET /api/auth/me` to restore the user.
5. If the backend answers 401 (expired token), the token is removed and the user is logged out.

## How the frontend gets data

```text
Page  ->  useApiData(fetcher)  ->  service function  ->  api.ts (Axios)  ->  backend
```

| Piece | Job |
| --- | --- |
| `types/` | TypeScript shapes of every API answer (`Route`, `Stop`, `Alert`, ...), copied from `docs/API.md` |
| `services/` | One small function per endpoint, for example `getRoutes()` or `addFavorite(id)` |
| `hooks/useApiData.ts` | Calls a service and returns `loading`, `success` (with the data) or `error` (with a message) |
| `components/` | `RouteCard`, `RouteDetails`, `AlertCard`, `StatusBadge`, `TypeBadge`, `ErrorMessage`, `ReportForm` |
| `utils/format.ts` | Pesos, times (`5:00 AM`), durations, distances |

Every page shows a spinner while loading, a red message with "Try again" when the backend fails,
and an empty-state message when there is nothing to show.

Note: "Popular Routes" on the home page is simply the first three active routes by name. The system
has no usage statistics yet, so a real popularity ranking is a future improvement.
"Running now" counts the active routes that are inside their operating hours at this moment.

## The map

Page `/map` (`pages/Map.tsx`) loads every route and stop once, then filters them in the browser.

| Piece | Job |
| --- | --- |
| `components/MapView.tsx` | The Leaflet map: OpenStreetMap tiles, one colored line per route, stop markers, origin (A) and destination (B) markers, zoom to the selected route |
| `components/StopMarker.tsx` | A terminal (green pin) or stop. Its name shows on hover or on a tap; a tap opens the info card |
| `components/RouteSummary.tsx` | Route name, type, code, starting point, destination, stops, fare, hours, travel time, status. Used in the line popup and the side panel |
| `components/MapFilters.tsx` | Bus / Jeepney / Van and Active / Inactive check boxes |
| `components/MapInfoCard.tsx` | The card that answers a tap: the routes on a road, or the routes that leave a terminal. Its title folds it down |
| `utils/mapIcons.ts` | The A and B markers, drawn with HTML so no image files are needed |

How it behaves:

- Line colors come from `utils/transportColors.ts`, but a route that is not ACTIVE right now is drawn gray
  (set in `MapView.tsx`). Every line is solid; the badges show the exact status.
- "Inactive routes" in the filter means every route that is not ACTIVE right now: outside its operating hours,
  or set to inactive or suspended by an admin.
- On a phone the info card sits along the bottom of the map. Showing a route folds it down to its title,
  and the map zooms to the route above it. Tap the title to open the card again.
- Click a line: a popup opens and the route is selected (thicker line, details under the map).
- Click a stop: its popup lists the routes through it, with "Set as origin / destination" buttons.
- "Pick origin / destination" then a click on the map places the A / B marker. "Use my location"
  asks the browser for your position (only when you click it).
- When an origin is set, the stops within 2 km are listed, using `GET /api/stops/nearby`.
- `/map?route=3` opens the map with route 3 selected (the "View on map" button on a route page).
- The straight-line distance between A and B is only an approximation, not a travel distance.
  Finding transportation between A and B is done by the route search below.

## Route search

The search asks the backend (`GET /api/routes/search?origin=...&destination=...`). It returns **active**
routes that pass a stop matching the origin and, later on the same route, a stop matching the destination.
So Lipa to Batangas finds the Lipa-to-Batangas routes but not the Batangas-to-Lipa ones.
The match is "the stop name contains the text", ignoring upper and lower case. Routes that need a
transfer are not searched yet.

| Piece | Job |
| --- | --- |
| `components/RouteSearch.tsx` | The two inputs, a swap button, stop-name suggestions, checks that both places are filled in and different |
| `components/SearchResults.tsx` | Calls the search, shows the results, and lets the user sort by fastest or cheapest |
| `components/SearchResultCard.tsx` | One result: type, route name, origin and destination, where to get on and off, stops, fare, travel time, operating schedule, status |
| `utils/tripSection.ts` | Finds the part of a route the passenger rides, and how long it takes |

Where it appears:

- **Routes page** (`/routes?origin=Lipa&destination=Batangas`): the search form on top. The address holds the
  search, so it can be shared and the Back button works.
- **Map page** (`/map?origin=Lipa&destination=Batangas`): the same form. The matching routes stay bright and
  all other routes are dimmed, and the map zooms to them. The side panel lists the results.
- **Pick A and B on the map**, then "Find routes between A and B". The nearest stop to each point is used for the search.

Notes:

- The fare shown is for the whole route. The backend does not price a part of a route.
- "Estimated time (whole route)" is the full trip. The blue line "Get on at ... get off at ..." shows the time between the two stops.

## Admin dashboard

All pages under `/admin` need an ADMIN login (`ProtectedRoute requireAdmin`, and the backend checks the role again).

| Page | What the admin can do |
| --- | --- |
| `pages/admin/Dashboard.tsx` | See totals (routes, stops, users, alerts, open reports) and a bar chart of active and inactive routes |
| `pages/admin/RoutesManagement.tsx` | Search, add, edit, delete routes; change status (active / inactive / suspended) |
| `pages/admin/StopsManagement.tsx` | Search, add, edit, delete stops |
| `pages/admin/TransportationManagement.tsx` | Add, edit, delete buses, jeepneys and vans |
| `pages/admin/AlertsManagement.tsx` | Add, edit, delete alerts; hide an alert by making it inactive |
| `pages/admin/UsersManagement.tsx` | Change a user's role, disable or enable an account, and update the status of commuter reports |

Shared pieces in `components/admin/`: `DataTable`, `Pagination`, `Modal`, `ConfirmDialog`, `Notice`,
`AdminPageHeader`, `FormControls`, `BarChart`, and the forms `RouteForm`, `StopForm`,
`TransportationForm`, `AlertForm`.

Things to know:

- Routes, stops and users are paged by the server (`/api/admin/...?search=&page=&size=`). Transportation and alerts are
  short lists, so they are paged in the browser with `usePagination`.
- Every form checks the input first (`utils/routeForm.ts` for routes), then shows the backend's field errors under the
  matching input if the server still refuses (for example a duplicate route code).
- Deleting something that is still used (a stop on a route, a transportation on a route) is refused by the backend with
  status 409. The message is shown inside the confirm dialog.
- **Route line:** when you edit a route without changing its stops, the stored line (which may follow real roads) is kept.
  If you change the stops, the line is drawn straight through the new stops. Run `database/tools/snap-routes-to-roads.mjs`
  again to make it follow the roads.
- You cannot change your own role or disable your own account.
- Vehicles, drivers, schedules and fares are edited inside the route form or come from the sample data. They have no
  separate admin screens yet.
