# Final checklist, demo script and defense notes

## 1. Before you push to `main`

**Repository hygiene** (run in Git Bash at the project root)
```bash
git status                                   # nothing unexpected is staged
git ls-files | grep -E "(^|/)\.env$"         # must print NOTHING (.env is never committed)
git ls-files | grep -iE "node_modules|/target/|\.class$"   # must print NOTHING
git ls-files | grep -iE "Shuttle|Train\.java"              # must print NOTHING (removed types)
git ls-files | grep -F "{frontend"           # must print NOTHING (old typo folder)
```
If a command prints something, remove it with `git rm -r --cached <path>` (keeps your local copy) or delete the file.

**Temporary files removed in the final cleanup** (delete them if they are still in your project):
```bash
git rm frontend/src/pages/SetupCheck.tsx frontend/src/types/Api.ts frontend/src/components/PagePlaceholder.tsx
```
`App.tsx` no longer has the `/setup-check` page.

**Build and test**
```bash
docker compose up -d && docker compose ps       # routa-db is "healthy"
cd backend && ./mvnw clean test                 # all green
cd ../frontend && npm run build && npm test     # build succeeds, tests green
```

**Content**
- [ ] README: fill in the "Problem Being Addressed", "Team Members and Roles" and "Contributors" TODOs
- [ ] README: replace the screenshot placeholders with real images in `docs/screenshots/`
- [ ] The footer shows the "demo data" notice on every page
- [ ] `.env.example` has only fake values; your real `.env` is not in Git
- [ ] The demo admin and user passwords are set in your own `.env` (not shared in chat or committed)

## 2. Requirement coverage

| Requirement | Where |
|---|---|
| Abstraction | `Transportation` (abstract class), `RouteSearchService` (interface) |
| Encapsulation | Private fields with validating setters, read-only `getRouteStops()`, immutable `Coordinate` record |
| Inheritance | `Bus`, `Jeepney`, `Van` extend `Transportation` (one table, `SINGLE_TABLE`) |
| Polymorphism | `calculateFare` and `getTransportationType` overridden per type; `ApiException.getStatus()` overridden per exception |
| REST API with validation and clear errors | `controller/`, `dto/`, `GlobalExceptionHandler`, `docs/API.md` |
| PostgreSQL database | `database/schema.sql`, `docker-compose.yml`, `docs/DATABASE-DESIGN.md` |
| Login and roles (USER / ADMIN) | Spring Security + JWT, BCrypt, role checks on every admin endpoint |
| Map with routes and stops | Leaflet + OpenStreetMap, `/map` |
| Route search A to B | `/api/routes/search`, Routes page and Map page |
| Admin management | `/admin`: routes, stops, transportation, alerts, users, reports |
| Tests | 130 backend tests, frontend tests, `docs/TESTING.md` |
| Documentation | `README.md` and `docs/` |
| No secrets in Git, demo data labeled | `.env` ignored, demo notice in README and UI |

## 3. Five-minute demo script

1. **Home** (30 s): the statistics, and point out the demo-data notice in the footer.
2. **Routes** (45 s): filter by Bus, then search Lipa to Batangas. The fastest route is first, and each result shows its own fare.
3. **Map** (60 s): colored lines per type, click a route, click a stop, use the filters.
4. **Login as a user** (30 s): add a favorite, send a report about a route.
5. **Login as admin** (90 s): dashboard, add a stop, edit a route (change a stop), create an alert, review the report you just sent.
6. **Show the code** (45 s): `Transportation` and its three children, and the fare test (`TransportationPolymorphismTest`).

Start the backend and frontend before the demo, log in once to check, and keep a second browser tab on the map.

## 4. Questions you may be asked

**Why is `Transportation` abstract?** A "plain transportation" does not exist, only a bus, a jeepney or a van. The abstract methods force every type to define its own fare and its own type name.

**Where is polymorphism used in real code?** `Route.calculateFare()` calls `transportation.calculateFare(...)` without checking the type. The real object (Bus, Jeepney or Van) decides the price. The test `sameCallGivesDifferentFaresForEachType` proves it.

**Why not `Admin extends User`?** An admin has no extra data or behavior, only more permissions, so a `Role` enum is the honest design. Inheritance is used where the children really add data and behavior.

**What is encapsulation here?** Fields are private and setters reject bad values (latitude outside -90 to 90, negative fares, an origin equal to the destination). Outside code cannot add stops to a route's list directly; it must call `addRouteStop`.

**Why one table for all transportation types?** `SINGLE_TABLE` inheritance is simple, fast to query, and the types differ by only one field each. The drawback is nullable columns for fields that belong to other types, which the Java setters and the service checks guard (for example a van must have a seating capacity).

**Why DTOs?** The API never exposes entities directly, so internal fields (like password hashes) cannot leak, and request validation lives in one place.

**How is the password stored?** As a BCrypt hash. Login errors for a wrong email, a wrong password and a disabled account are identical, so nobody can discover which emails exist.

**Why JWT and what is the weakness?** The server stays stateless, so it needs no session storage. The token is kept in `localStorage`, which is simple but readable by injected scripts (XSS). An httpOnly cookie is safer against that, but then CSRF protection is needed. The backend re-reads the user's role and active flag from the database on every request, so disabling an account works immediately.

**Why `ddl-auto=validate`?** Hibernate only checks that the entities match `schema.sql` and never changes tables by itself, so the schema stays under our control.

**What does the app not do?** No live GPS, traffic or arrival times, and no routes with transfers (see "Known Limitations" in the README). The data is fictional.

**How do the map lines follow roads?** A one-time tool asks the public OSRM service for road geometry and writes SQL we review. The running app never calls OSRM.
