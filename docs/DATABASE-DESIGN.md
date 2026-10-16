# Database Design — Routa (PostgreSQL)

> All sample rows are fictional demo data, not official transportation information.

## Entity Relationship Diagram

GitHub renders this diagram automatically.

```mermaid
erDiagram
    USERS ||--o{ FAVORITES : saves
    USERS ||--o{ REPORTS : submits
    USERS ||--o{ ALERTS : creates
    ROUTES ||--o{ FAVORITES : "saved in"
    ROUTES ||--o{ REPORTS : "reported on"
    ROUTES ||--o{ ALERTS : "may have"
    TRANSPORTATIONS ||--o{ ROUTES : operates
    TRANSPORTATIONS ||--o{ VEHICLES : owns
    DRIVERS |o--o| VEHICLES : drives
    ROUTES ||--|| FARES : "has one"
    ROUTES ||--o{ SCHEDULES : "has many"
    ROUTES ||--o{ ROUTE_STOPS : contains
    STOPS ||--o{ ROUTE_STOPS : "used in"
    ROUTES ||--o{ ROUTE_POINTS : "drawn by"

    USERS { bigint id PK
            string email UK
            string password_hash
            string role }
    TRANSPORTATIONS { bigint id PK
            string code UK
            string transport_type }
    ROUTES { bigint id PK
            string route_code UK
            string origin
            string destination
            string status
            int estimated_minutes
            double distance_km
            bigint transportation_id FK }
    STOPS { bigint id PK
            string name
            double latitude
            double longitude }
    ROUTE_STOPS { bigint id PK
            bigint route_id FK
            bigint stop_id FK
            int stop_order }
    ROUTE_POINTS { bigint route_id PK
            int point_order PK
            double latitude
            double longitude }
    FARES { bigint id PK
            bigint route_id FK
            numeric base_fare
            numeric per_km_rate }
    SCHEDULES { bigint id PK
            bigint route_id FK
            time first_trip
            time last_trip }
    VEHICLES { bigint id PK
            string plate_number UK
            bigint transportation_id FK
            bigint driver_id FK }
    DRIVERS { bigint id PK
            string license_number UK }
    ALERTS { bigint id PK
            string severity
            bigint route_id FK }
    FAVORITES { bigint id PK
            bigint user_id FK
            bigint route_id FK }
    REPORTS { bigint id PK
            bigint user_id FK
            bigint route_id FK
            string status }
```

## Design decisions (good answers for your defense)

| Decision | Why |
|---|---|
| **One `transportations` table for Bus, Jeepney and Van** (single-table inheritance) | The types share most columns. A `transport_type` column tells Java which subclass to build. Type-specific columns (`has_air_conditioning`, `is_modernized`, `seating_capacity`) are NULL for other types. |
| **`route_stops` is its own table** | A stop can be on many routes and a route has many stops (many-to-many). The table also stores `stop_order`, so it cannot be a plain join table. |
| **`route_points` separate from stops** | Stops are where people board. Points only shape the line on the map. |
| **Role is a column on `users`** | An admin has no extra data, only different permissions, so no `admins` table or subclass. |
| **Money is `NUMERIC(8,2)`** | Decimals like 0.1 are inexact in `double`. Java will use `BigDecimal`. |
| **Database `CHECK` constraints** | Latitude/longitude ranges, non-negative fares and valid statuses are enforced even if someone bypasses the API. The backend still validates too. |
| **Delete rules** | Deleting a route also deletes its stops-links, points, fare, schedules, favorites and reports (CASCADE). A transportation or stop that is still in use cannot be deleted (RESTRICT). Deleting a route keeps its alerts but clears the link (SET NULL). |
| **`is_demo_data` flag** | Lets the UI label sample data clearly. |
| **No `OTHER` transport type yet** | Every type needs a real Java subclass. Add one later if needed. |

## Normalization
- No repeating groups: stops, points, schedules and fares live in their own tables.
- Every non-key column depends only on its table's key (for example a stop's name is stored once in `stops`, not per route).
- Route origin/destination are plain text for simple searching.

## How the schema is applied
- `database/schema.sql` creates the tables (safe to re-run).
- `database/seed/sample-data.sql` inserts demo data (run once).
- Docker runs both automatically the first time the database starts empty.
- Hibernate is set to `validate`: it only checks that the Java entities match these tables and never changes them.
