package com.transithub.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import com.transithub.exception.TooManyRequestsException;

/**
 * Counts how many times something was tried, per key ("login:ana@example.com",
 * "register:127.0.0.1", "report:7"), and answers 429 Too Many Requests when a key
 * goes over its limit before its time window ends.
 *
 * The counts are kept in memory, so restarting the backend clears them.
 */
@Component
public class RateLimiter {

    /** How many tries a key made, and when its time window ends. */
    private record Tries(int count, Instant windowEnd) {

        boolean windowIsOver(Instant now) {
            return !now.isBefore(windowEnd);
        }
    }

    // ConcurrentHashMap, because many requests can arrive at the same moment
    private final Map<String, Tries> triesByKey = new ConcurrentHashMap<>();

    /**
     * Counts one try for this key. Throws TooManyRequestsException (429) when
     * the key already used all its tries in the current time window.
     */
    public void hit(String key, int maxTries, Duration window) {
        Instant now = Instant.now();
        removeOldKeys(now);

        // compute() reads and updates the count in one step, even when two requests come together
        Tries tries = triesByKey.compute(key, (k, old) ->
                old == null || old.windowIsOver(now)
                        ? new Tries(1, now.plus(window))                 // first try: a new window starts
                        : new Tries(old.count() + 1, old.windowEnd()));  // one more try, same window

        if (tries.count() > maxTries) {
            long secondsLeft = Duration.between(now, tries.windowEnd()).toSeconds();
            long minutesLeft = Math.max(1, (secondsLeft + 59) / 60);   // round up: 61 seconds = 2 minutes
            throw new TooManyRequestsException("Too many tries. Please wait " + minutesLeft
                    + (minutesLeft == 1 ? " minute" : " minutes") + " and try again.");
        }
    }

    /** Forgets the tries of one key, for example after a successful login. */
    public void reset(String key) {
        triesByKey.remove(key);
    }

    /** Forgets every key. The tests use it, so each test starts from zero. */
    public void resetAll() {
        triesByKey.clear();
    }

    /** Keeps the memory small: once there are many keys, drop the ones whose window is over. */
    private void removeOldKeys(Instant now) {
        if (triesByKey.size() > 1_000) {
            triesByKey.values().removeIf(tries -> tries.windowIsOver(now));
        }
    }
}