package com.transithub.service;

import com.transithub.dto.HealthResponse;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Checks that the application is running and can talk to PostgreSQL.
 * The business logic lives here, not in the controller.
 */
@Service
public class HealthService {

    private static final String APPLICATION_NAME = "routa";

    private final DataSource dataSource;

    // Spring gives us the DataSource (the database connection pool) automatically.
    public HealthService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public HealthResponse checkHealth() {
        // try-with-resources closes the connection for us, even if an error happens
        try (Connection connection = dataSource.getConnection()) {
            boolean connected = connection.isValid(2); // wait at most 2 seconds
            Long routeCount = connected ? countRoutes(connection) : null;
            return new HealthResponse(APPLICATION_NAME, "UP", connected ? "UP" : "DOWN", routeCount);
        } catch (SQLException e) {
            return new HealthResponse(APPLICATION_NAME, "UP", "DOWN", null);
        }
    }

    private Long countRoutes(Connection connection) {
        try (Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery("SELECT COUNT(*) FROM routes")) {
            return resultSet.next() ? resultSet.getLong(1) : null;
        } catch (SQLException e) {
            // The "routes" table is missing: database/schema.sql was probably not loaded yet.
            return null;
        }
    }
}
