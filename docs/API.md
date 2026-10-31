# Routa REST API

Base address while developing: `http://localhost:8080`. All data is JSON.
All route, stop and fare data is **fictional demo data**.

## Authentication and roles

Login uses a **JWT token**. Register or log in, then send the token with every request that needs it:

```text
Authorization: Bearer <token>
```

| Method | Path | What it does | Who |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Create a USER account, returns a token (201) | everyone |
| POST | `/api/auth/login` | Log in, returns a token (200) | everyone |
| GET | `/api/auth/me` | The logged-in user's details | any logged-in user |

Register body: `{"fullName":"Ana Cruz","email":"ana@example.com","password":"Passw0rd-1"}`
(password: 8 to 72 characters, at least one letter and one number).
Login body: `{"email":"ana@example.com","password":"Passw0rd-1"}`

Response of both:

```json
{
  "token": "eyJhbGciOi...",
  "tokenType": "Bearer",
  "expiresInSeconds": 86400,
  "user": { "id": 3, "fullName": "Ana Cruz", "email": "ana@example.com",
            "role": "USER", "active": true, "createdAt": "2026-10-02T04:15:30Z" }
}
```

A wrong email, a wrong password and a disabled account all return the same
`401 "Invalid email or password"`, so nobody can find out which emails have accounts.

| Role | Can do |
| --- | --- |
| anyone (not logged in) | register, log in, and every **GET** on routes, stops, transportations, alerts and stats |
| `USER` | everything above, plus favorites, reports and `/api/auth/me` |
| `ADMIN` | everything above, plus every create/update/delete on routes, stops, transportations and alerts, and everything under `/api/admin` |

Endpoints marked **ADMIN** below return `401` without a login and `403` for a normal user.
Nobody can register as an admin: admins are created by the demo-account setup or promoted by another admin.

## Favorites and reports (logged-in users)

| Method | Path | What it does | Success |
| --- | --- | --- | --- |
| GET | `/api/favorites` | My saved routes | 200 |
| POST | `/api/favorites/{routeId}` | Save a route (409 if already saved) | 201 |
| DELETE | `/api/favorites/{routeId}` | Remove a saved route | 204 |
| POST | `/api/reports` | Report wrong route info: `{"routeId":1,"description":"The fare is wrong"}` | 201 |
| GET | `/api/reports/mine` | The reports I sent | 200 |

The user is taken from the token, never from the URL, so nobody can read another person's favorites.

## Routes

| Method | Path | What it does | Success |
| --- | --- | --- | --- |
| GET | `/api/routes` | All routes. Optional filters: `?type=BUS` and `?status=ACTIVE` | 200 |
| GET | `/api/routes/search?origin=Lipa&destination=Batangas` | Active direct routes, fastest first | 200 |
| GET | `/api/routes/{id}` | One route with stops, map line, fare, schedules | 200 |
| GET | `/api/routes/{id}/stops` | The stops of a route, in order | 200 |
| POST | `/api/routes` | **ADMIN** create a route | 201 + `Location` header |
| PUT | `/api/routes/{id}` | **ADMIN** replace a route | 200 |
| PATCH | `/api/routes/{id}/status` | **ADMIN** change status: `{"status":"SUSPENDED"}` | 200 |
| DELETE | `/api/routes/{id}` | **ADMIN** delete a route | 204 |

Route statuses: `ACTIVE`, `INACTIVE`, `SUSPENDED`. `status` is the one an admin sets.
`currentStatus` is the status right now: an `ACTIVE` route shows `INACTIVE` outside its
operating hours (Philippine time). A route without a schedule keeps its `status`.

### Example response (`GET /api/routes/{id}`, shortened)

```json
{
  "id": 1,
  "routeCode": "LB-JEEP-01",
  "routeName": "Lipa - Batangas City (Jeepney)",
  "origin": "Lipa City",
  "destination": "Batangas City",
  "status": "ACTIVE",
  "currentStatus": "ACTIVE",
  "estimatedMinutes": 60,
  "distanceKm": 30.0,
  "demoData": true,
  "transportation": {
    "id": 1, "name": "Lipa-Batangas Jeepney Association (Demo)", "code": "JEEP-LB",
    "type": "Jeepney", "description": "Demo jeepney service",
    "details": { "modernized": false }
  },
  "estimatedFare": 35.10,
  "fareRule": { "baseFare": 13.00, "perKmRate": 0.85 },
  "stops": [
    { "stopOrder": 1, "minutesFromStart": 0,
      "stop": { "id": 1, "name": "Lipa City Grand Terminal", "description": "...",
                "latitude": 13.938, "longitude": 121.162, "demoData": true } }
  ],
  "path": [ { "latitude": 13.938, "longitude": 121.162 } ],
  "schedules": [
    { "firstTrip": "05:00:00", "lastTrip": "22:00:00", "frequencyMinutes": 15, "daysOperating": "MON-SUN" }
  ]
}
```

`path` is the list of points the frontend turns into a Leaflet polyline.
`estimatedFare` is calculated by the route's transportation type.

### Request body for POST / PUT `/api/routes`

```json
{
  "routeCode": "LB-JEEP-02",
  "routeName": "Lipa - Batangas City (Jeepney 2)",
  "origin": "Lipa City",
  "destination": "Batangas City",
  "status": "ACTIVE",
  "estimatedMinutes": 60,
  "distanceKm": 30.0,
  "transportationId": 1,
  "fare": { "baseFare": 13.00, "perKmRate": 0.85 },
  "stops": [
    { "stopId": 1, "minutesFromStart": 0 },
    { "stopId": 6, "minutesFromStart": 35 },
    { "stopId": 7, "minutesFromStart": 60 }
  ],
  "path": [],
  "schedules": [
    { "firstTrip": "05:00", "lastTrip": "22:00", "frequencyMinutes": 15, "daysOperating": "MON-SUN" }
  ]
}
```

- The **order of `stops`** is the order of the route.
- `path` and `schedules` are optional. An empty `path` draws the line through the stops.
- A route needs at least 2 different stops.

## Stops

| Method | Path | What it does | Success |
| --- | --- | --- | --- |
| GET | `/api/stops` | All stops. Optional `?search=lipa` | 200 |
| GET | `/api/stops/nearby?lat=13.94&lng=121.16&radiusKm=2` | Stops within the radius, nearest first (`radiusKm` default 2, max 50) | 200 |
| GET | `/api/stops/{id}` | One stop | 200 |
| GET | `/api/stops/{id}/routes` | Routes passing through the stop | 200 |
| POST | `/api/stops` | **ADMIN** create | 201 |
| PUT | `/api/stops/{id}` | **ADMIN** update | 200 |
| DELETE | `/api/stops/{id}` | **ADMIN** delete (not allowed while a route uses it) | 204 |

Stop body: `{"name":"Lipa Public Market","description":"...","latitude":13.9411,"longitude":121.1631}`

## Transportations

| Method | Path | What it does | Success |
| --- | --- | --- | --- |
| GET | `/api/transportations` | All services. Optional `?type=BUS` | 200 |
| GET | `/api/transportations/{id}` | One service | 200 |
| POST | `/api/transportations` | **ADMIN** create | 201 |
| PUT | `/api/transportations/{id}` | **ADMIN** update (the type cannot change) | 200 |
| DELETE | `/api/transportations/{id}` | **ADMIN** delete (not allowed while routes or vehicles use it) | 204 |

Types and their extra fields:

| `type` | Extra field(s) |
| --- | --- |
| `BUS` | `airConditioned` (true/false) |
| `JEEPNEY` | `modernized` (true/false) |
| `VAN` | `seatingCapacity` (required) |

Example: `{"type":"VAN","name":"Lipa Van Express","code":"VAN-LX","seatingCapacity":15}`

## Alerts

| Method | Path | What it does | Success |
| --- | --- | --- | --- |
| GET | `/api/alerts` | Active alerts, newest first | 200 |
| GET | `/api/alerts/{id}` | One alert | 200 |
| POST | `/api/alerts` | **ADMIN** publish an alert | 201 |
| PUT | `/api/alerts/{id}` | **ADMIN** update | 200 |
| DELETE | `/api/alerts/{id}` | **ADMIN** delete | 204 |

Alert body: `{"title":"...","message":"...","severity":"INFO|WARNING|CRITICAL","routeId":null,"active":true}`
(`routeId` and `active` are optional.)

## Statistics and admin

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/stats` | Home page numbers: active routes, stops, available vehicles, active alerts |
| GET | `/api/admin/stats` | **ADMIN** dashboard numbers |
| GET | `/api/admin/routes?search=&page=0&size=10` | **ADMIN** paged route table |
| GET | `/api/admin/stops?search=&page=0&size=10` | **ADMIN** paged stop table |
| GET | `/api/admin/alerts` | **ADMIN** all alerts, including inactive |
| GET | `/api/admin/reports?status=OPEN` | **ADMIN** user reports |
| PATCH | `/api/admin/reports/{id}/status` | **ADMIN** `{"status":"REVIEWED"}` (`OPEN`, `REVIEWED`, `RESOLVED`) |
| GET | `/api/admin/users?search=&page=0&size=10` | **ADMIN** paged user table (search by name or email) |
| PATCH | `/api/admin/users/{id}/active` | **ADMIN** `{"active":false}` deactivates an account |
| PATCH | `/api/admin/users/{id}/role` | **ADMIN** `{"role":"ADMIN"}` (`USER` or `ADMIN`) |

Paged responses look like `{"items":[...],"page":0,"size":10,"totalItems":8,"totalPages":1}`.

## Errors

Every error uses the same JSON format:

```json
{
  "status": 404,
  "message": "Route not found with id 999999",
  "timestamp": "2026-10-02T04:15:30.123Z",
  "path": "/api/routes/999999",
  "errors": []
}
```

For validation problems (status 400) `errors` lists every invalid field:

```json
{
  "status": 400,
  "message": "Validation failed",
  "timestamp": "2026-10-02T04:15:30.123Z",
  "path": "/api/stops",
  "errors": [
    { "field": "name", "message": "Stop name cannot be empty" },
    { "field": "latitude", "message": "Latitude must be between -90 and 90" }
  ]
}
```

Nested fields use their full path, for example `fare.baseFare` or `stops[0].stopId`.

| Code | When it happens |
| --- | --- |
| 200 OK | It worked |
| 201 Created | Something was created |
| 204 No Content | Deleted |
| 400 Bad Request | Invalid input: a validation rule failed, the JSON is broken or has an unknown value (for example `"severity":"PURPLE"`), a parameter is missing or has the wrong type, or a business rule failed (for example a route with fewer than 2 stops) |
| 401 Unauthorized | Not logged in, bad token, or wrong login details |
| 403 Forbidden | Logged in but your role is not allowed (for example a USER calling an ADMIN endpoint) |
| 404 Not Found | The record or URL does not exist |
| 405 Method Not Allowed | Wrong HTTP method for that URL |
| 409 Conflict | A duplicate (route code, stop name, ...) or something that is still in use (a stop used by a route) |
| 415 Unsupported Media Type | The body is not sent as `application/json` |
| 500 Internal Server Error | Unexpected problem. The message is generic; details are only in the server log |

## Try it with curl (Git Bash)

```bash
curl http://localhost:8080/api/health
curl "http://localhost:8080/api/routes/search?origin=Lipa&destination=Batangas"
curl "http://localhost:8080/api/stops/nearby?lat=13.9411&lng=121.1631&radiusKm=5"
# log in (use the demo admin password you put in .env) and keep the token
curl -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" \
     -d '{"email":"admin@routa.local","password":"YOUR_PASSWORD"}'
# create a stop (needs an admin token)
curl -X POST http://localhost:8080/api/stops -H "Content-Type: application/json" \
     -H "Authorization: Bearer PASTE_TOKEN_HERE" \
     -d '{"name":"My Test Stop","latitude":13.95,"longitude":121.16}'
```
