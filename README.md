# Routa

> **Demo data notice:** All routes, stops, fares, schedules, vehicles and drivers in this project are
> fictional sample data for a school project. They are **not** official transportation
> information. Routa does **not** provide live GPS tracking, traffic or arrival times.

## Project Description
Routa is a full-stack web application that helps commuters explore public transportation routes such as buses, jeepneys, and vans through an interactive map.
Users can search for routes between two places and view important information such as stops, fares, and operating hours. Administrators can manage routes, stops, transportation information, and alerts through the system.

## Guide Questions:

- What problem are you addressing? 

  Routa addresses this problem by providing transportation information in one
  centralized system where users can easily search for routes, view stops on a map, and
  check available transportation details.

- Who experiences the problem?

  Mostly Students and Other commuters new to the area

- Why is it important to solve?

  It is important to solve this problem because students and other commuters may have difficulty finding reliable     and organized transportation information. Routa provides route details, stops, fares, and operating hours in one     centralized system, making transportation information easier to access and understand. 


## Project Objectives
 **General Objective**
 
 To develop a Java-based application that will allow users to view transportation routes and stops using an interactive map. 	

**Specific Objectives**

The project aims to:

- To allow users to search and view available transportation routes.
- To display transportation stops and routes through an interactive map.
- To provide users with information about fares and operating hours.
- To allow users to save their favorite transportation routes.
- To apply Java Object-Oriented Programming concepts in developing the system.
- To provide administrators with a way to manage transportation information.

## Target Users
- **Commuters:** view and search routes, save favorites, read alerts, report wrong information.

## Main Features

**For everyone (no login)**
- Home page with statistics and a short introduction
- Route list with filters by transportation type, and route details (stops in order, fare, schedule, status)
- Interactive map (Leaflet + OpenStreetMap): colored route lines by type, stop markers, filters, text search
- Route search from one place to another (direct routes, fastest or cheapest first), also from two points picked on the map
- Service alerts

**For logged-in users**
- Register, log in, log out (JWT login)
- Favorite routes
- Report wrong or outdated route information
- Profile page


## Technologies Used
| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router, Axios, Leaflet, React Leaflet |
| Backend | Java 21, Spring Boot, Spring Web, Spring Data JPA, Spring Security (JWT), Maven |
| Database | PostgreSQL (run with Docker Compose) |
| Map | Leaflet + OpenStreetMap tiles |
| Testing | JUnit 5 and Spring Boot Test (backend), Vitest and React Testing Library (frontend) |
| Tools | Git, GitHub, Docker Compose, VS Code |

## Project Structure
```
transithub/
├── frontend/       React + TypeScript (Vite)
├── backend/        Spring Boot (Maven)
├── database/       schema.sql, seed/sample-data.sql, migrations/, tools/ (road-alignment tool)
├── docs/           API.md, DATABASE-DESIGN.md, OOP-DESIGN.md, FRONTEND-SETUP.md, TESTING.md
├── .env.example    Template for environment variables (copy to .env)
├── docker-compose.yml  Local PostgreSQL
└── README.md
```

Backend layers: **controller** (HTTP) → **service** (rules) → **repository** (database), with
**dto** and **mapper** classes between the controllers and the entities, and one
`GlobalExceptionHandler` that turns every error into the same JSON format.

## Setup

### 1. Prerequisites
- Git
- Docker Desktop (for PostgreSQL) **or** a local PostgreSQL installation
- Java 21 or newer (the project is built for Java 21) and the included Maven wrapper (`mvnw`)
- Node.js 18 or newer

### 2. Environment variables
```bash
cp .env.example .env     # Windows CMD: copy .env.example .env
```
Open `.env` and set your own values. **Never commit `.env`** (it is in `.gitignore`).

| Variable | Meaning |
|---|---|
| `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` | Database name and login (Docker uses them to create the database) |
| `DATABASE_URL` | JDBC address used by Spring Boot, must match the values above |
| `JWT_SECRET` | Long random string (32+ characters) that signs login tokens. Weak or example values are refused |
| `JWT_EXPIRATION_MS` | Token lifetime in milliseconds (default 86400000 = 24 hours) |
| `CORS_ALLOWED_ORIGINS` | Frontend address allowed to call the API (default `http://localhost:5173`) |
| `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD` | Demo admin account created at startup (skipped if the password is empty) |
| `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD` | Demo user account created at startup (skipped if the password is empty) |

### 3. Start the database
```bash
docker compose up -d
docker compose ps        # STATUS should become "healthy"
```
On the **first start with an empty database**, Docker automatically runs `database/schema.sql`
(tables) and `database/seed/sample-data.sql` (fictional demo data: 8 routes, 8 stops, 4 transportation
services, 6 vehicles, 5 drivers, 2 alerts).

If the database already existed before these files were added, apply them once by hand
(Git Bash / macOS / Linux):
```bash
docker exec -i transithub-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < database/schema.sql
docker exec -i transithub-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < database/seed/sample-data.sql
```
Do this only once: loading the sample data twice creates duplicate rows.

Reset everything (**deletes all database data**): `docker compose down -v` then `docker compose up -d`.

### 4. Run the backend
```bash
cd backend
./mvnw spring-boot:run          # Windows CMD: mvnw spring-boot:run
```
Open <http://localhost:8080/api/health>. You should see `"database":"UP"`. Stop the server with `Ctrl+C`.

### 5. Run the frontend
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open <http://localhost:5173>. The frontend calls the backend at `http://localhost:8080`
(change it with `VITE_API_BASE_URL` in `frontend/.env` if needed).

### 6. Run the tests
```bash
cd backend && ./mvnw clean test      # needs the database running
cd frontend && npm test              # after the one-time Vitest setup in docs/TESTING.md
```
See [docs/TESTING.md](docs/TESTING.md) for what is tested and a manual checklist.

## Sample Accounts
The demo accounts are created by the backend at startup, **only when you set their passwords in your own `.env`**.
No password is stored in the code or in Git.

| Role | Email (default) | Password |
|---|---|---|
| Admin | `admin@transithub.local` | the value of `DEMO_ADMIN_PASSWORD` in your `.env` |
| User | `user@transithub.local` | the value of `DEMO_USER_PASSWORD` in your `.env` |

Anyone can also register a normal account on the Register page. Nobody can register as an admin:
an admin is a demo account or is promoted by another admin. These accounts are for development
and the school demo only.

## OOP Principles Demonstrated
Full explanation with class diagram: [docs/OOP-DESIGN.md](docs/OOP-DESIGN.md).

| Principle | Where in the code | Proof |
|---|---|---|
| **Abstraction** | `Transportation` is an abstract class with abstract methods `getTransportationType()` and `calculateFare(...)`. `RouteSearchService` is an interface: callers depend on the contract, not on one implementation | `TransportationPolymorphismTest` |
| **Encapsulation** | Entity fields are private; setters validate (for example latitude must be -90 to 90). `Route.getRouteStops()` is read-only, stops are added only through `route.addRouteStop(...)`. `Coordinate` is an immutable record | `RouteEncapsulationTest` |
| **Inheritance** | `Bus`, `Jeepney` and `Van` extend `Transportation` and inherit its shared data and helper methods. One table stores all three (`SINGLE_TABLE`) | `EntityMappingTest` |
| **Polymorphism** | The same `calculateFare` call gives a different fare for each type (overriding). `Route.calculateFare()` never checks the type: the right subclass answers | `TransportationPolymorphismTest` |

## API Documentation
The full list of endpoints, request bodies, error format and curl examples is in [docs/API.md](docs/API.md).
A short overview:

| Area | Examples | Who |
|---|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | everyone / logged in |
| Routes | `GET /api/routes`, `GET /api/routes/search?origin=&destination=`, `GET /api/routes/{id}` | everyone |
| Stops | `GET /api/stops`, `GET /api/stops/nearby?lat=&lng=` | everyone |
| Transportation, Alerts, Stats | `GET /api/transportations`, `GET /api/alerts`, `GET /api/stats` | everyone |
| Favorites and reports | `GET /api/favorites`, `POST /api/reports` | logged-in users |
| Create, update, delete | `POST/PUT/DELETE` on routes, stops, transportations, alerts | admin only |
| Admin area | `GET /api/admin/stats`, `/api/admin/users`, `/api/admin/reports` | admin only |

Errors always use the same JSON format: `status`, `message`, `timestamp`, `path` and a list of field `errors`.
More documents: [database design](docs/DATABASE-DESIGN.md), [frontend notes](docs/FRONTEND-SETUP.md).

## Route Lines on Real Roads
The sample routes can be redrawn along real roads with a one-time tool that uses the public OSRM routing service.
It writes SQL that you review and apply. The running app never calls OSRM. See
[database/tools/README.md](database/tools/README.md).

## Screenshots
_Placeholders: replace with real screenshots (save them in `docs/screenshots/`)._

| Screen | File to add |
|---|---|
| Home page | `docs/screenshots/home.png` |
| Routes list and search | `docs/screenshots/routes.png` |
| Map with route lines | `docs/screenshots/map.png` |
| Route details | `docs/screenshots/route-details.png` |
| Admin dashboard | `docs/screenshots/admin-dashboard.png` |
| Admin route form | `docs/screenshots/admin-route-form.png` |

## Known Limitations
- Sample data only; not official transportation information.
- Routes are stored coordinates: no live GPS, traffic or arrival times.
- Route search finds **direct** routes only (no transfers). A place matches when a stop name contains the text you typed.
- Vehicles, drivers, schedules and fares have no separate admin screens: schedules and fares are edited inside the
  route form, vehicles and drivers come from the sample data.
- The login token is kept in the browser's `localStorage`. This is simple for a school project but is not the safest
  option against cross-site scripting (an httpOnly cookie would be, but it needs extra CSRF protection).
- Map tiles need an internet connection (OpenStreetMap).

## Future Improvements
Real-time GPS tracking, traffic information, estimated arrival times, route optimization with transfers,
a mobile app, public transportation API integration, and separate admin screens for vehicles and drivers.

## Team Members and Roles
| Name | Role |
|---|---|
| Rodrigo B. Alderite Jr. | Backend Developer |
| Red Zildjian C. Sepillo | Frontend Developer |
| Kirk Em Neo M. Legaspi | Frontend Developer and Data Gathering |
| Karl Vincent C. Samonte | Data Gathering |

## GitHub Workflow
Branches:
```
main                 stable, demo-ready code only
develop              integration branch
feature/backend      Spring Boot work
feature/frontend     React work
feature/maps         Leaflet map
feature/auth         login / JWT
feature/admin        admin dashboard
```
Flow: create a feature branch from `develop` → commit small changes → open a Pull Request into `develop` →
teammate reviews → merge. Merge `develop` into `main` only when it works.

Commit message examples:
```
feat: create route entity
feat: add route REST API
feat: implement map view
feat: add JWT authentication
feat: create admin route management
fix: validate route coordinates
docs: update README setup steps
```

## Contributors
| No. | SR-Code | Name | GitHub Username |
|---|---|---|---|
| 1 | 25-03341 | Rodrigo B. Alderite Jr. | potzkie1906 |
| 2 | 25-00846 | Red Zildjian C. Sepillo | zildpula |
| 3 | 25-05723 | Kirk Em Neo M. Legaspi | KirkEmNeo15 |
| 4 | 25-04055 | Karl Vincent C. Samonte | karlvincentsamonte |

