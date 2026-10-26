package com.transithub.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.transithub.entity.Route;
import com.transithub.entity.enums.RouteStatus;
import com.transithub.exception.InvalidRequestException;
import com.transithub.repository.RouteRepository;

/**
 * First implementation of RouteSearchService: finds DIRECT routes only
 * (no transfers). Only ACTIVE routes are returned.
 */
@Service
public class DirectRouteSearchService implements RouteSearchService {

    // No town or stop name is anywhere near this long
    private static final int MAX_SEARCH_LENGTH = 100;

    private final RouteRepository routeRepository;

    public DirectRouteSearchService(RouteRepository routeRepository) {
        this.routeRepository = routeRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Route> findDirectRoutes(String origin, String destination) {
        if (origin == null || origin.isBlank()) {
            throw new InvalidRequestException("Origin cannot be empty");
        }
        if (destination == null || destination.isBlank()) {
            throw new InvalidRequestException("Destination cannot be empty");
        }
        String from = origin.trim();
        String to = destination.trim();
        if (from.length() > MAX_SEARCH_LENGTH || to.length() > MAX_SEARCH_LENGTH) {
            throw new InvalidRequestException(
                    "Origin and destination must be at most " + MAX_SEARCH_LENGTH + " characters");
        }
        if (from.equalsIgnoreCase(to)) {
            throw new InvalidRequestException("Origin and destination must be different");
        }
        return routeRepository.findDirectRoutes(from, to, RouteStatus.ACTIVE);
    }
}