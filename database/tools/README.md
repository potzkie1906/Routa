# Road alignment tool

The demo data stores each route line as a few points between stops, so the lines on the map are
straight segments. `snap-routes-to-roads.mjs` replaces them with lines that follow real roads
and moves each stop onto the nearest road.

The lines are still **stored in the database** (table `route_points`). The running application never
calls a routing service. Only this one-time tool does, using OSRM (a routing engine that uses
OpenStreetMap data, free demo server `router.project-osrm.org`).

## Steps
1. Start the database and the backend (`./mvnw spring-boot:run` in `backend/`).
2. From the project root:
   ```bash
   node database/tools/snap-routes-to-roads.mjs
   ```
   You need Node.js 18 or newer (the frontend already needs it). It makes one request per route
   and waits a moment between them, so it takes about 15 seconds.
3. Read the output. Each route prints `OK` with the number of points. A `WARN` line means a stop
   would move more than 300 m, so check that it landed on the right road (open the generated SQL,
   or look at the stop on openstreetmap.org).
4. Apply the generated file to the database:
   ```bash
   docker exec -i routa-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < database/seed/route-paths.sql
   ```
   It runs in one transaction, and running it again gives the same result.
5. Reload the map page. The lines now follow the roads.
6. Commit `database/seed/route-paths.sql`, so teammates can apply the same file after
   `sample-data.sql` and get the same map.

## Things to know
- **The distance and travel time stored for each route are not changed.** The tool prints the road
  distance next to the stored value for your information. Changing them would change the demo
  fares (the tests expect 35.10 and 55.00).
- **OSRM plans for cars.** A jeepney or bus may use a different road, and the demo server's map
  can differ from real traffic rules. Treat the result as a good approximation.
- **Fair use:** the free server is meant for light use. Do not run the tool in a loop. If it
  reports a failure, wait a minute and run it again (it rewrites the whole file).
- **More exact stops:** the stop coordinates in the demo data are approximate. For exact positions,
  right-click the place on openstreetmap.org, copy the coordinates, and edit the stop in the admin
  screen (Phase 16). Run the tool again afterwards.
- **Options:** `--no-snap-stops` keeps the stops where they are, `--tolerance-m 8` makes lines
  simpler (fewer points), `--api` and `--osrm` change the addresses. See the top of the script.
- **Undo:** to go back to the straight demo lines, reset the database
  (`docker compose down -v`, then `docker compose up -d`) and do not apply `route-paths.sql`.
- The map credit "OpenStreetMap contributors" stays visible on the map, as the data license requires.
