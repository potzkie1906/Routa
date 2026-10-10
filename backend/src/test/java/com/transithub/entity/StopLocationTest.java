package com.transithub.entity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Encapsulation: a stop protects the meaning of "location verified".
 * Plain unit test (no Spring, no database).
 */
class StopLocationTest {

    @Test
    void aNewStopIsNotVerified() {
        Stop stop = new Stop("Test Terminal", null, 13.79, 121.06);
        assertFalse(stop.isLocationVerified());
    }

    @Test
    void keepingTheSameCoordinatesKeepsTheVerification() {
        Stop stop = new Stop("Test Terminal", null, 13.790168, 121.061538);
        stop.setLocationVerified(true);

        stop.moveTo(13.790168, 121.061538);

        assertTrue(stop.isLocationVerified());
    }

    @Test
    void movingAVerifiedStopClearsTheVerification() {
        Stop stop = new Stop("Test Terminal", null, 13.790168, 121.061538);
        stop.setLocationVerified(true);

        stop.moveTo(13.762, 121.059);

        assertFalse(stop.isLocationVerified(), "new coordinates have not been checked yet");
        assertEquals(13.762, stop.getLatitude());
        assertEquals(121.059, stop.getLongitude());
    }

    @Test
    void moveToStillRejectsInvalidCoordinates() {
        Stop stop = new Stop("Test Terminal", null, 13.79, 121.06);
        assertThrows(IllegalArgumentException.class, () -> stop.moveTo(95, 121.06));
    }
}
