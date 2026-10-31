package com.transithub.mapper;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Component;

import com.transithub.dto.CoordinateDto;
import com.transithub.dto.response.FareResponse;
import com.transithub.dto.response.RouteResponse;
import com.transithub.dto.response.RouteStopResponse;
import com.transithub.dto.response.ScheduleResponse;
import com.transithub.entity.Fare;
import com.transithub.entity.Route;

/**
 * Converts a Route (and everything inside it) into a RouteResponse.
 * It must be called while the database transaction is still open,
 * because stops, path and schedules are loaded lazily.
 */
@Component
public class RouteMapper {

    private final StopMapper stopMapper;
    private final TransportationMapper transportationMapper;
    private final Clock clock; // Philippine time, from ClockConfig

    public RouteMapper(StopMapper stopMapper, TransportationMapper transportationMapper, Clock clock) {
        this.stopMapper = stopMapper;
        this.transportationMapper = transportationMapper;
        this.clock = clock;
    }

    public RouteResponse toResponse(Route route) {
        Fare fare = route.getFare();
        FareResponse fareRule = (fare == null) ? null : new FareResponse(fare.getBaseFare(), fare.getPerKmRate());
        BigDecimal estimatedFare = (fare == null) ? null : route.calculateFare();

        List<ScheduleResponse> schedules = route.getSchedules().stream()
                .map(s -> new ScheduleResponse(
                        s.getFirstTrip(), s.getLastTrip(), s.getFrequencyMinutes(), s.getDaysOperating()))
                .toList();

        List<CoordinateDto> path = route.getPath().stream()
                .map(c -> new CoordinateDto(c.latitude(), c.longitude()))
                .toList();

        return new RouteResponse(
                route.getId(),
                route.getRouteCode(),
                route.getRouteName(),
                route.getOrigin(),
                route.getDestination(),
                route.getStatus().name(),
                route.currentStatus(LocalDateTime.now(clock)).name(),
                route.getEstimatedMinutes(),
                route.getDistanceKm(),
                route.isDemoData(),
                transportationMapper.toResponse(route.getTransportation()),
                estimatedFare,
                fareRule,
                toStopResponses(route),
                path,
                schedules);
    }

    public List<RouteStopResponse> toStopResponses(Route route) {
        return route.getRouteStops().stream()
                .map(rs -> new RouteStopResponse(
                        rs.getStopOrder(), rs.getMinutesFromStart(), stopMapper.toResponse(rs.getStop())))
                .toList();
    }
}
