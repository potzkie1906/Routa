-- =====================================================================
-- Routa database schema (PostgreSQL)
--
-- This script is safe to run more than once (IF NOT EXISTS).
-- Money uses NUMERIC (exact decimals), never floating point.
-- Coordinates use DOUBLE PRECISION and are range-checked.
-- =====================================================================

-- ---------------------------------------------------------------------
-- USERS
-- role is a simple column: USER or ADMIN (no separate roles table needed)
-- password_hash stores a BCrypt hash, never the real password
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    full_name       VARCHAR(100)  NOT NULL CHECK (btrim(full_name) <> ''),
    email           VARCHAR(255)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    role            VARCHAR(10)   NOT NULL DEFAULT 'USER'
                    CHECK (role IN ('USER', 'ADMIN')),
    active          BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- TRANSPORTATIONS (one table for all types: single-table inheritance)
-- transport_type tells Java which subclass to create:
--   BUS -> Bus, JEEPNEY -> Jeepney, VAN -> Van
-- The columns after "description" belong to one specific type only
-- and are NULL for the other types.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transportations (
    id                    BIGSERIAL PRIMARY KEY,
    name                  VARCHAR(100) NOT NULL CHECK (btrim(name) <> ''),
    code                  VARCHAR(30)  NOT NULL UNIQUE,
    transport_type        VARCHAR(20)  NOT NULL
                          CHECK (transport_type IN ('BUS', 'JEEPNEY', 'VAN')),
    description           VARCHAR(500),
    -- Bus only
    has_air_conditioning  BOOLEAN,
    -- Jeepney only
    is_modernized         BOOLEAN,
    -- Van only
    seating_capacity      INTEGER CHECK (seating_capacity IS NULL OR seating_capacity > 0)
);

-- ---------------------------------------------------------------------
-- DRIVERS and VEHICLES
-- A transportation service has many vehicles.
-- A driver drives at most one vehicle (UNIQUE driver_id).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drivers (
    id              BIGSERIAL PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL CHECK (btrim(full_name) <> ''),
    license_number  VARCHAR(30)  NOT NULL UNIQUE,
    contact_number  VARCHAR(20),
    active          BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS vehicles (
    id                 BIGSERIAL PRIMARY KEY,
    plate_number       VARCHAR(20) NOT NULL UNIQUE,
    capacity           INTEGER     NOT NULL CHECK (capacity > 0),
    status             VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                       CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'RETIRED')),
    transportation_id  BIGINT NOT NULL
                       REFERENCES transportations (id) ON DELETE RESTRICT,
    driver_id          BIGINT UNIQUE
                       REFERENCES drivers (id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- STOPS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stops (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL CHECK (btrim(name) <> ''),
    description    VARCHAR(500),
    latitude       DOUBLE PRECISION NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
    longitude      DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    is_demo_data   BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------------------
-- ROUTES
-- distance_km is needed so each transportation type can calculate a fare.
-- A route is operated by one transportation service.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS routes (
    id                 BIGSERIAL PRIMARY KEY,
    route_code         VARCHAR(30)  NOT NULL UNIQUE,
    route_name         VARCHAR(150) NOT NULL CHECK (btrim(route_name) <> ''),
    origin             VARCHAR(100) NOT NULL CHECK (btrim(origin) <> ''),
    destination        VARCHAR(100) NOT NULL CHECK (btrim(destination) <> ''),
    status             VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                       CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    estimated_minutes  INTEGER NOT NULL CHECK (estimated_minutes > 0),
    distance_km        DOUBLE PRECISION NOT NULL CHECK (distance_km > 0),
    transportation_id  BIGINT NOT NULL
                       REFERENCES transportations (id) ON DELETE RESTRICT,
    is_demo_data       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (lower(btrim(origin)) <> lower(btrim(destination)))
);

-- ---------------------------------------------------------------------
-- ROUTE_STOPS: which stops a route passes through, in order.
-- This is the many-to-many link between routes and stops.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS route_stops (
    id                 BIGSERIAL PRIMARY KEY,
    route_id           BIGINT  NOT NULL REFERENCES routes (id) ON DELETE CASCADE,
    stop_id            BIGINT  NOT NULL REFERENCES stops (id)  ON DELETE RESTRICT,
    stop_order         INTEGER NOT NULL CHECK (stop_order > 0),
    minutes_from_start INTEGER NOT NULL DEFAULT 0 CHECK (minutes_from_start >= 0),
    UNIQUE (route_id, stop_order),
    UNIQUE (route_id, stop_id)
);

-- ---------------------------------------------------------------------
-- ROUTE_POINTS: the latitude/longitude points that draw the route line
-- (the polyline) on the map, in order.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS route_points (
    route_id     BIGINT  NOT NULL REFERENCES routes (id) ON DELETE CASCADE,
    point_order  INTEGER NOT NULL CHECK (point_order >= 0),
    latitude     DOUBLE PRECISION NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
    longitude    DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    PRIMARY KEY (route_id, point_order)
);

-- ---------------------------------------------------------------------
-- FARES: one fare rule per route (1 to 1). Currency is Philippine peso.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fares (
    id            BIGSERIAL PRIMARY KEY,
    route_id      BIGINT NOT NULL UNIQUE REFERENCES routes (id) ON DELETE CASCADE,
    base_fare     NUMERIC(8,2) NOT NULL CHECK (base_fare >= 0),
    per_km_rate   NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (per_km_rate >= 0)
);

-- ---------------------------------------------------------------------
-- SCHEDULES: a route can have several (e.g. weekday and weekend)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedules (
    id                 BIGSERIAL PRIMARY KEY,
    route_id           BIGINT NOT NULL REFERENCES routes (id) ON DELETE CASCADE,
    first_trip         TIME   NOT NULL,
    last_trip          TIME   NOT NULL,
    frequency_minutes  INTEGER NOT NULL CHECK (frequency_minutes > 0),
    days_operating     VARCHAR(50) NOT NULL DEFAULT 'MON-SUN',
    CHECK (first_trip < last_trip)
);

-- ---------------------------------------------------------------------
-- ALERTS: route_id is optional (NULL = general announcement)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(150) NOT NULL CHECK (btrim(title) <> ''),
    message     VARCHAR(1000) NOT NULL CHECK (btrim(message) <> ''),
    severity    VARCHAR(10) NOT NULL DEFAULT 'INFO'
                CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    route_id    BIGINT REFERENCES routes (id) ON DELETE SET NULL,
    created_by  BIGINT REFERENCES users (id)  ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- FAVORITES: a user saves a route (a user can save a route only once)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorites (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users (id)  ON DELETE CASCADE,
    route_id    BIGINT NOT NULL REFERENCES routes (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, route_id)
);

-- ---------------------------------------------------------------------
-- REPORTS: a user reports incorrect route information
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users (id)  ON DELETE CASCADE,
    route_id     BIGINT NOT NULL REFERENCES routes (id) ON DELETE CASCADE,
    description  VARCHAR(1000) NOT NULL CHECK (btrim(description) <> ''),
    status       VARCHAR(10) NOT NULL DEFAULT 'OPEN'
                 CHECK (status IN ('OPEN', 'REVIEWED', 'RESOLVED')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- INDEXES (speed up the searches the app does most)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_routes_status          ON routes (status);
CREATE INDEX IF NOT EXISTS idx_routes_transportation  ON routes (transportation_id);
CREATE INDEX IF NOT EXISTS idx_routes_origin          ON routes (lower(origin));
CREATE INDEX IF NOT EXISTS idx_routes_destination     ON routes (lower(destination));
CREATE INDEX IF NOT EXISTS idx_stops_name             ON stops (lower(name));
CREATE INDEX IF NOT EXISTS idx_route_stops_stop       ON route_stops (stop_id);
CREATE INDEX IF NOT EXISTS idx_schedules_route        ON schedules (route_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active          ON alerts (active);
CREATE INDEX IF NOT EXISTS idx_vehicles_transport     ON vehicles (transportation_id);
CREATE INDEX IF NOT EXISTS idx_reports_status         ON reports (status);
