package com.transithub.dto.response;

import java.math.BigDecimal;
import java.util.List;

import com.transithub.dto.CoordinateDto;

/**
 * Everything the app needs to show one route: details, stops, the map line, fare and schedules.
 * estimatedFare is calculated by the route's transportation type (polymorphism).
 */
public record RouteResponse(
        Long id,
        String routeCode,
        String routeName,
        String origin,
        String destination,
        String status,
        String currentStatus,
        int estimatedMinutes,
        double distanceKm,
        boolean demoData,
        TransportationResponse transportation,
        BigDecimal estimatedFare,
        FareResponse fareRule,
        List<RouteStopResponse> stops,
        List<CoordinateDto> path,
        List<ScheduleResponse> schedules) {
}
