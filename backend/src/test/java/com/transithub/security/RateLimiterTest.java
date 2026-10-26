package com.transithub.security;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

import com.transithub.exception.TooManyRequestsException;

/** The rate limiter on its own: no Spring and no database needed. */
class RateLimiterTest {

    private static final Duration WINDOW = Duration.ofMinutes(15);

    private final RateLimiter rateLimiter = new RateLimiter();

    @Test
    void allowsTheTriesUpToTheLimitThenRefuses() {
        for (int i = 1; i <= 3; i++) {
            assertDoesNotThrow(() -> rateLimiter.hit("login:ana@example.com", 3, WINDOW));
        }
        TooManyRequestsException ex = assertThrows(TooManyRequestsException.class,
                () -> rateLimiter.hit("login:ana@example.com", 3, WINDOW));
        assertEquals("Too many tries. Please wait 15 minutes and try again.", ex.getMessage());
    }

    @Test
    void everyKeyHasItsOwnCount() {
        for (int i = 1; i <= 3; i++) {
            rateLimiter.hit("login:ana@example.com", 3, WINDOW);
        }
        assertDoesNotThrow(() -> rateLimiter.hit("login:ben@example.com", 3, WINDOW));
    }

    @Test
    void resetStartsTheCountAgain() {
        for (int i = 1; i <= 3; i++) {
            rateLimiter.hit("login:ana@example.com", 3, WINDOW);
        }
        rateLimiter.reset("login:ana@example.com");
        assertDoesNotThrow(() -> rateLimiter.hit("login:ana@example.com", 3, WINDOW));
    }

    @Test
    void aNewWindowStartsWhenTheOldOneIsOver() throws InterruptedException {
        Duration shortWindow = Duration.ofMillis(100);
        rateLimiter.hit("report:7", 1, shortWindow);
        assertThrows(TooManyRequestsException.class, () -> rateLimiter.hit("report:7", 1, shortWindow));

        Thread.sleep(150); // wait until the 100 ms window is over
        assertDoesNotThrow(() -> rateLimiter.hit("report:7", 1, shortWindow));
    }
}