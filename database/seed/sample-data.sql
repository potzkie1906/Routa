-- =====================================================================
-- RoutaSAMPLE / DEMO DATA
-- *** FICTIONAL DATA FOR A SCHOOL PROJECT. NOT OFFICIAL TRANSPORTATION INFORMATION. ***
-- Coordinates are approximate. Replace them with exact values from
-- openstreetmap.org if you want more accurate map lines.
-- Run AFTER schema.sql, and only once (re-running causes duplicate-key errors).
-- User accounts are NOT here: passwords must be BCrypt-hashed, so the Java
-- backend creates the demo accounts at startup (see .env.example).
-- =====================================================================

-- STOPS
INSERT INTO stops (id, name, description, latitude, longitude, is_demo_data) VALUES
(1, 'Lipa City Grand Terminal', 'Main terminal in Lipa City (demo data)', 13.938, 121.162, TRUE),
(2, 'Lipa Public Market', 'Public market in the city center (demo data)', 13.9411, 121.1631, TRUE),
(3, 'SM City Lipa', 'Shopping mall stop (demo data)', 13.9525, 121.166, TRUE),
(4, 'Malvar Junction', 'Junction stop in Malvar (demo data)', 14.0449, 121.1584, TRUE),
(5, 'Tanauan Terminal', 'Terminal in Tanauan City (demo data)', 14.0859, 121.1498, TRUE),
(6, 'Ibaan Junction', 'Junction stop in Ibaan (demo data)', 13.8186, 121.1318, TRUE),
(7, 'Batangas Grand Terminal', 'Main terminal in Batangas City (demo data)', 13.762, 121.059, TRUE),
(8, 'Tambo Barangay Hall', 'Stop in Barangay Tambo, Lipa City (demo data)', 13.97, 121.145, TRUE);

-- TRANSPORTATIONS (one row per service; transport_type picks the Java subclass)
INSERT INTO transportations (id, name, code, transport_type, description, has_air_conditioning, is_modernized, seating_capacity) VALUES
(1, 'Lipa-Batangas Jeepney Association (Demo)', 'JEEP-LB', 'JEEPNEY', 'Demo jeepney service', NULL, FALSE, NULL),
(2, 'Southern Express Bus (Demo)', 'BUS-SE', 'BUS', 'Demo air-conditioned bus service', TRUE, NULL, NULL),
(3, 'Lipa Van Express (Demo)', 'VAN-LX', 'VAN', 'Demo van service', NULL, NULL, 15),
(5, 'Lipa Local Jeepney (Demo)', 'JEEP-LL', 'JEEPNEY', 'Demo local jeepney service', NULL, TRUE, NULL);

-- DRIVERS (fake)
INSERT INTO drivers (id, full_name, license_number) VALUES
(1, 'Demo Driver 1', 'DEMO-LIC-0001'),
(2, 'Demo Driver 2', 'DEMO-LIC-0002'),
(3, 'Demo Driver 3', 'DEMO-LIC-0003'),
(4, 'Demo Driver 4', 'DEMO-LIC-0004'),
(5, 'Demo Driver 5', 'DEMO-LIC-0005');

-- VEHICLES (fake plates)
INSERT INTO vehicles (id, plate_number, capacity, status, transportation_id, driver_id) VALUES
(1, 'DEMO 001', 24, 'ACTIVE', 1, 1),
(2, 'DEMO 002', 50, 'ACTIVE', 2, 2),
(3, 'DEMO 003', 15, 'ACTIVE', 3, 3),
(4, 'DEMO 004', 20, 'ACTIVE', 5, 4),
(5, 'DEMO 005', 22, 'ACTIVE', 5, 5),
(6, 'DEMO 006', 15, 'MAINTENANCE', 3, NULL);

-- ROUTES
INSERT INTO routes (id, route_code, route_name, origin, destination, status, estimated_minutes, distance_km, transportation_id, is_demo_data) VALUES
(1, 'LB-JEEP-01', 'Lipa - Batangas City (Jeepney)', 'Lipa City', 'Batangas City', 'ACTIVE', 60, 30, 1, TRUE),
(2, 'LB-BUS-01', 'Lipa - Batangas City Express (Bus)', 'Lipa City', 'Batangas City', 'ACTIVE', 45, 30, 2, TRUE),
(3, 'LM-JEEP-01', 'Lipa - Malvar', 'Lipa City', 'Malvar', 'ACTIVE', 25, 12, 5, TRUE),
(4, 'LT-VAN-01', 'Lipa - Tanauan (Van)', 'Lipa City', 'Tanauan', 'ACTIVE', 35, 18, 3, TRUE),
(5, 'BT-BUS-01', 'Batangas City - Tanauan (Bus)', 'Batangas City', 'Tanauan', 'ACTIVE', 75, 50, 2, TRUE),
(6, 'BL-VAN-01', 'Batangas City - Lipa (Van)', 'Batangas City', 'Lipa City', 'ACTIVE', 50, 30, 3, TRUE),
(7, 'LS-JEEP-01', 'Lipa - SM City (Jeepney)', 'Lipa City', 'SM City Lipa', 'ACTIVE', 15, 4, 5, TRUE),
(8, 'LTM-JEEP-01', 'Lipa - Tambo', 'Lipa City', 'Tambo', 'INACTIVE', 20, 8, 5, TRUE);

-- ROUTE_STOPS (stop_order = order along the route)
INSERT INTO route_stops (route_id, stop_id, stop_order, minutes_from_start) VALUES
(1, 1, 1, 0),
(1, 6, 2, 35),
(1, 7, 3, 60),
(2, 1, 1, 0),
(2, 7, 2, 45),
(3, 1, 1, 0),
(3, 2, 2, 8),
(3, 4, 3, 25),
(4, 1, 1, 0),
(4, 4, 2, 18),
(4, 5, 3, 35),
(5, 7, 1, 0),
(5, 6, 2, 25),
(5, 1, 3, 45),
(5, 4, 4, 60),
(5, 5, 5, 75),
(6, 7, 1, 0),
(6, 6, 2, 25),
(6, 1, 3, 50),
(7, 1, 1, 0),
(7, 2, 2, 7),
(7, 3, 3, 15),
(8, 2, 1, 0),
(8, 8, 2, 20);

-- ROUTE_POINTS (points of the line drawn on the map; straight lines between stops for now)
INSERT INTO route_points (route_id, point_order, latitude, longitude) VALUES
(1, 0, 13.938, 121.162),
(1, 1, 13.8186, 121.1318),
(1, 2, 13.762, 121.059),
(2, 0, 13.938, 121.162),
(2, 1, 13.88, 121.11),
(2, 2, 13.762, 121.059),
(3, 0, 13.938, 121.162),
(3, 1, 13.9411, 121.1631),
(3, 2, 14.0449, 121.1584),
(4, 0, 13.938, 121.162),
(4, 1, 14.0449, 121.1584),
(4, 2, 14.0859, 121.1498),
(5, 0, 13.762, 121.059),
(5, 1, 13.8186, 121.1318),
(5, 2, 13.938, 121.162),
(5, 3, 14.0449, 121.1584),
(5, 4, 14.0859, 121.1498),
(6, 0, 13.762, 121.059),
(6, 1, 13.8186, 121.1318),
(6, 2, 13.938, 121.162),
(7, 0, 13.938, 121.162),
(7, 1, 13.9411, 121.1631),
(7, 2, 13.9525, 121.166),
(8, 0, 13.9411, 121.1631),
(8, 1, 13.97, 121.145);

-- FARES (pesos; demo values)
INSERT INTO fares (route_id, base_fare, per_km_rate) VALUES
(1, 13, 0.85),
(2, 20, 1.0),
(3, 13, 0.85),
(4, 30, 1.5),
(5, 20, 1.0),
(6, 30, 1.5),
(7, 13, 0.85),
(8, 13, 0.85);

-- SCHEDULES
INSERT INTO schedules (route_id, first_trip, last_trip, frequency_minutes, days_operating) VALUES
(1, '05:00', '22:00', 15, 'MON-SUN'),
(2, '04:30', '21:00', 30, 'MON-SUN'),
(3, '05:00', '21:00', 10, 'MON-SUN'),
(4, '05:30', '20:00', 20, 'MON-SUN'),
(5, '05:00', '20:00', 30, 'MON-SUN'),
(6, '05:00', '20:00', 20, 'MON-SUN'),
(7, '06:00', '21:00', 15, 'MON-SUN'),
(8, '05:00', '19:00', 20, 'MON-SUN');

-- ALERTS (demo)
INSERT INTO alerts (title, message, severity, active, route_id) VALUES
('Demo announcement', 'This is a sample announcement. All Routa data is fictional demo data.', 'INFO', TRUE, NULL),
('Lipa - Tambo temporarily inactive (demo)', 'Sample alert showing a route-specific warning.', 'WARNING', TRUE, 8);

-- Because we inserted explicit ids, move each id counter past the highest id used,
-- so new rows created by the app do not collide with these.
SELECT setval(pg_get_serial_sequence('stops', 'id'),            (SELECT MAX(id) FROM stops));
SELECT setval(pg_get_serial_sequence('transportations', 'id'),  (SELECT MAX(id) FROM transportations));
SELECT setval(pg_get_serial_sequence('drivers', 'id'),          (SELECT MAX(id) FROM drivers));
SELECT setval(pg_get_serial_sequence('vehicles', 'id'),         (SELECT MAX(id) FROM vehicles));
SELECT setval(pg_get_serial_sequence('routes', 'id'),           (SELECT MAX(id) FROM routes));
