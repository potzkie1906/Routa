-- =====================================================================
-- Migration 002: verified location of Batangas Grand Terminal.
-- Run this ONCE on a database that was created before this change.
-- (A brand-new database made from schema.sql + sample-data.sql does not need it.)
--
-- What it does:
--   1. adds the column stops.location_verified (FALSE for every existing stop)
--   2. moves "Batangas Grand Terminal" to its verified location on Diversion Road,
--      Alangilan, Batangas City (13.790168, 121.061538) and marks it verified.
--      The old demo position (13.762, 121.059) was about 3.1 km too far south.
--   3. redraws the line of every route through that terminal as straight segments
--      between its stops, because the old line ended at the wrong place.
--      Run the road tool afterwards to make those lines follow the roads again
--      (database/tools/README.md). The tool keeps verified stops where they are.
-- Everything runs in one transaction: if something fails, nothing is changed.
-- See docs/LOCATION-VERIFICATION.md for the sources.
-- =====================================================================
BEGIN;

-- 1) the new column
ALTER TABLE stops ADD COLUMN IF NOT EXISTS location_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) the verified terminal location (stops with an error if the stop does not exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM stops WHERE name = 'Batangas Grand Terminal') THEN
        RAISE EXCEPTION 'No stop named "Batangas Grand Terminal" was found. Nothing was changed.';
    END IF;
END $$;

UPDATE stops
SET latitude = 13.790168,
    longitude = 121.061538,
    description = 'Diversion Road, Alangilan, Batangas City (real location; routes are demo data)',
    location_verified = TRUE
WHERE name = 'Batangas Grand Terminal';

-- 3) straight lines through the stops for every route that passes through the terminal
CREATE TEMPORARY TABLE affected_routes ON COMMIT DROP AS
SELECT DISTINCT rs.route_id
FROM route_stops rs
JOIN stops s ON s.id = rs.stop_id
WHERE s.name = 'Batangas Grand Terminal';

DELETE FROM route_points
WHERE route_id IN (SELECT route_id FROM affected_routes);

INSERT INTO route_points (route_id, point_order, latitude, longitude)
SELECT rs.route_id,
       ROW_NUMBER() OVER (PARTITION BY rs.route_id ORDER BY rs.stop_order) - 1,
       s.latitude,
       s.longitude
FROM route_stops rs
JOIN stops s ON s.id = rs.stop_id
WHERE rs.route_id IN (SELECT route_id FROM affected_routes);

COMMIT;
