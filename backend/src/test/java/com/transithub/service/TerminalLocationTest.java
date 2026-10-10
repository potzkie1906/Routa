package com.transithub.service;

import com.transithub.dto.request.StopRequest;
import com.transithub.dto.response.StopResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The Batangas City terminal is stored at its verified location (docs/LOCATION-VERIFICATION.md),
 * and an admin edit that moves a verified stop clears the "verified" mark.
 * Needs the database (Docker running, sample data or migration 002 applied). Rolled back after each test.
 */
@SpringBootTest
@Transactional
class TerminalLocationTest {

    private static final String TERMINAL = "Batangas Grand Terminal";

    @Autowired
    private StopService stopService;

    private StopResponse terminal() {
        return stopService.getStops(TERMINAL).stream()
                .filter(stop -> stop.name().equals(TERMINAL))
                .findFirst()
                .orElseThrow(() -> new AssertionError(TERMINAL + " is missing from the database"));
    }

    @Test
    void batangasGrandTerminalIsAtItsVerifiedLocation() {
        StopResponse stop = terminal();
        assertEquals(13.790168, stop.latitude(), 0.000001);
        assertEquals(121.061538, stop.longitude(), 0.000001);
        assertTrue(stop.locationVerified());
    }

    @Test
    void editingTheTextKeepsTheVerification() {
        StopResponse stop = terminal();
        StopResponse saved = stopService.updateStop(stop.id(),
                new StopRequest(stop.name(), "New description", stop.latitude(), stop.longitude()));
        assertTrue(saved.locationVerified());
    }

    @Test
    void movingTheTerminalClearsTheVerification() {
        StopResponse stop = terminal();
        StopResponse saved = stopService.updateStop(stop.id(),
                new StopRequest(stop.name(), stop.description(), stop.latitude() + 0.01, stop.longitude()));
        assertFalse(saved.locationVerified());
    }
}
