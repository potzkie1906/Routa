package com.transithub.entity;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.transithub.entity.enums.RouteStatus;

/** A route's status right now comes from its operating hours (Route.currentStatus). */
class RouteOperatingHoursTest {

    // 30 October 2026 is a Friday, 31 October a Saturday
    private static final LocalDateTime FRIDAY_NOON = LocalDateTime.of(2026, 10, 30, 12, 0);
    private static final LocalDateTime FRIDAY_NIGHT = LocalDateTime.of(2026, 10, 30, 22, 0);
    private static final LocalDateTime SATURDAY_NOON = LocalDateTime.of(2026, 10, 31, 12, 0);

    /** A route that runs from 5:00 AM to 9:00 PM on the given days. */
    private Route routeRunningOn(String days) {
        Route route = new Route("R-1", "Test Route", "A", "B", 30, 10.0, new Jeepney("J", "J-1", null, false));
        route.addSchedule(new Schedule(LocalTime.of(5, 0), LocalTime.of(21, 0), 10, days));
        return route;
    }

    @Test
    void activeOnlyDuringTheOperatingHours() {
        Route route = routeRunningOn("MON-SUN");
        assertEquals(RouteStatus.ACTIVE, route.currentStatus(FRIDAY_NOON));
        assertEquals(RouteStatus.INACTIVE, route.currentStatus(FRIDAY_NIGHT));
        assertEquals(RouteStatus.ACTIVE, route.currentStatus(LocalDateTime.of(2026, 10, 30, 21, 0)), "the last trip still counts");
        assertEquals(RouteStatus.INACTIVE, route.currentStatus(LocalDateTime.of(2026, 10, 30, 4, 59)));
    }

    @Test
    void inactiveOnDaysTheRouteDoesNotRun() {
        assertEquals(RouteStatus.ACTIVE, routeRunningOn("MON-FRI").currentStatus(FRIDAY_NOON));
        assertEquals(RouteStatus.INACTIVE, routeRunningOn("MON-FRI").currentStatus(SATURDAY_NOON));
        assertEquals(RouteStatus.ACTIVE, routeRunningOn("SAT,SUN").currentStatus(SATURDAY_NOON));
    }

    @Test
    void suspendedAndInactiveFromTheAdminAlwaysWin() {
        Route route = routeRunningOn("MON-SUN");
        route.setStatus(RouteStatus.SUSPENDED);
        assertEquals(RouteStatus.SUSPENDED, route.currentStatus(FRIDAY_NOON));
        route.setStatus(RouteStatus.INACTIVE);
        assertEquals(RouteStatus.INACTIVE, route.currentStatus(FRIDAY_NOON));
    }

    @Test
    void aRouteWithoutScheduleKeepsTheAdminStatus() {
        Route route = new Route("R-2", "No Schedule", "A", "B", 30, 10.0, new Jeepney("J", "J-2", null, false));
        assertEquals(RouteStatus.ACTIVE, route.currentStatus(FRIDAY_NIGHT));
    }

    @Test
    void readsTheDaysOperatingText() {
        Schedule wrapping = new Schedule(LocalTime.of(5, 0), LocalTime.of(21, 0), 10, "FRI-MON");
        assertTrue(wrapping.operatingDays().contains(DayOfWeek.SUNDAY), "a range can wrap around the week");
        assertFalse(wrapping.operatingDays().contains(DayOfWeek.WEDNESDAY));

        Schedule unreadable = new Schedule(LocalTime.of(5, 0), LocalTime.of(21, 0), 10, "weekends only");
        assertEquals(7, unreadable.operatingDays().size(), "text it cannot read counts as every day");
    }
}