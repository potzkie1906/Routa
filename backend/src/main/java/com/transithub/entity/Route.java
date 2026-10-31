package com.transithub.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.transithub.entity.enums.RouteStatus;
import com.transithub.util.ValidationUtils;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

/**
 * A transportation route, for example "Lipa - Batangas City".
 * It is the center of the model: it has stops, a map line, a fare and schedules.
 */
@Entity
@Table(name = "routes")
public class Route {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "route_code", nullable = false, unique = true, length = 30)
    private String routeCode;

    @Column(name = "route_name", nullable = false, length = 150)
    private String routeName;

    @Column(nullable = false, length = 100)
    private String origin;

    @Column(nullable = false, length = 100)
    private String destination;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RouteStatus status = RouteStatus.ACTIVE;

    @Column(name = "estimated_minutes", nullable = false)
    private int estimatedMinutes;

    @Column(name = "distance_km", nullable = false)
    private double distanceKm;

    @Column(name = "is_demo_data", nullable = false)
    private boolean demoData;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // MANY routes are operated by ONE transportation service
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transportation_id", nullable = false)
    private Transportation transportation;

    // ONE route has MANY route-stops (the stops in order). Deleting a route deletes them.
    @OneToMany(mappedBy = "route", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stopOrder ASC")
    private List<RouteStop> routeStops = new ArrayList<>();

    // The points of the map line, stored in the table route_points
    @ElementCollection
    @CollectionTable(name = "route_points", joinColumns = @JoinColumn(name = "route_id"))
    @OrderColumn(name = "point_order")
    private List<Coordinate> path = new ArrayList<>();

    // ONE route has ONE fare. The Fare class owns the foreign key (route_id).
    @OneToOne(mappedBy = "route", cascade = CascadeType.ALL, orphanRemoval = true)
    private Fare fare;

    @OneToMany(mappedBy = "route", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Schedule> schedules = new ArrayList<>();

    protected Route() {
    }

    public Route(String routeCode, String routeName, String origin, String destination,
                 int estimatedMinutes, double distanceKm, Transportation transportation) {
        setRouteCode(routeCode);
        setRouteName(routeName);
        setEndpoints(origin, destination);
        setEstimatedMinutes(estimatedMinutes);
        setDistanceKm(distanceKm);
        setTransportation(transportation);
    }

    // ---------- simple getters and validated setters ----------

    public Long getId() {
        return id;
    }

    public String getRouteCode() {
        return routeCode;
    }

    public void setRouteCode(String routeCode) {
        this.routeCode = ValidationUtils.requireNotBlank(routeCode, "Route code");
    }

    public String getRouteName() {
        return routeName;
    }

    public void setRouteName(String routeName) {
        this.routeName = ValidationUtils.requireNotBlank(routeName, "Route name");
    }

    public String getOrigin() {
        return origin;
    }

    public String getDestination() {
        return destination;
    }

    /**
     * Origin and destination are changed together, because the rule
     * "they must be different" involves both values.
     */
    public void setEndpoints(String origin, String destination) {
        String cleanOrigin = ValidationUtils.requireNotBlank(origin, "Origin");
        String cleanDestination = ValidationUtils.requireNotBlank(destination, "Destination");
        if (cleanOrigin.equalsIgnoreCase(cleanDestination)) {
            throw new IllegalArgumentException("Origin and destination must be different");
        }
        this.origin = cleanOrigin;
        this.destination = cleanDestination;
    }

    public RouteStatus getStatus() {
        return status;
    }

    public void setStatus(RouteStatus status) {
        this.status = ValidationUtils.requireNonNull(status, "Route status");
    }

    public int getEstimatedMinutes() {
        return estimatedMinutes;
    }

    public void setEstimatedMinutes(int estimatedMinutes) {
        this.estimatedMinutes = ValidationUtils.requirePositive(estimatedMinutes, "Estimated travel time");
    }

    public double getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(double distanceKm) {
        this.distanceKm = ValidationUtils.requirePositive(distanceKm, "Distance");
    }

    public boolean isDemoData() {
        return demoData;
    }

    public void setDemoData(boolean demoData) {
        this.demoData = demoData;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Transportation getTransportation() {
        return transportation;
    }

    public void setTransportation(Transportation transportation) {
        this.transportation = ValidationUtils.requireNonNull(transportation, "Transportation");
    }

    // ---------- relationships: outside code cannot change the lists directly ----------

    public List<RouteStop> getRouteStops() {
        return Collections.unmodifiableList(routeStops);
    }

    /** Adds a stop to this route at the given position. Keeps both sides of the link in sync. */
    public RouteStop addRouteStop(Stop stop, int stopOrder, int minutesFromStart) {
        RouteStop routeStop = new RouteStop(this, stop, stopOrder, minutesFromStart);
        routeStops.add(routeStop);
        return routeStop;
    }

    public void clearRouteStops() {
        routeStops.clear();
    }

    public List<Coordinate> getPath() {
        return Collections.unmodifiableList(path);
    }

    /** Replaces the map line with new points. */
    public void setPath(List<Coordinate> newPath) {
        path.clear();
        path.addAll(ValidationUtils.requireNonNull(newPath, "Route path"));
    }

    public Fare getFare() {
        return fare;
    }

    public void setFare(Fare fare) {
        this.fare = fare;
        if (fare != null) {
            fare.attachTo(this);
        }
    }

    public List<Schedule> getSchedules() {
        return Collections.unmodifiableList(schedules);
    }

    public void addSchedule(Schedule schedule) {
        ValidationUtils.requireNonNull(schedule, "Schedule").attachTo(this);
        schedules.add(schedule);
    }

    public void clearSchedules() {
        schedules.clear();
    }

    // ---------- behavior ----------

    /**
     * The fare for this whole route. The route does not know which type of transportation
     * it has: it just asks, and the right subclass (Bus, Jeepney, ...) answers.
     * This is polymorphism (dynamic method dispatch).
     */
    public BigDecimal calculateFare() {
        if (fare == null) {
            throw new IllegalStateException("Route " + routeCode + " has no fare rule");
        }
        return transportation.calculateFare(distanceKm, fare);
    }

     /**
     * The status riders see at that moment, worked out from the operating hours.
     * SUSPENDED and INACTIVE, set by an admin, always win. An ACTIVE route is only
     * ACTIVE while one of its schedules is running, and INACTIVE outside those hours.
     * A route without a schedule keeps the admin's status, because its hours are unknown.
     */
    public RouteStatus currentStatus(LocalDateTime now) {
        if (status != RouteStatus.ACTIVE || schedules.isEmpty()) {
            return status;
        }
        boolean operating = schedules.stream().anyMatch(schedule -> schedule.isOperatingAt(now));
        return operating ? RouteStatus.ACTIVE : RouteStatus.INACTIVE;
    }
}
