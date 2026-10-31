package com.transithub.entity;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.Set;

import com.transithub.util.ValidationUtils;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Operating hours and how often a vehicle leaves, for one route. */
@Entity
@Table(name = "schedules")
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_id", nullable = false)
    private Route route;

    @Column(name = "first_trip", nullable = false)
    private LocalTime firstTrip;

    @Column(name = "last_trip", nullable = false)
    private LocalTime lastTrip;

    @Column(name = "frequency_minutes", nullable = false)
    private int frequencyMinutes;

    @Column(name = "days_operating", nullable = false, length = 50)
    private String daysOperating;

    protected Schedule() {
    }

    public Schedule(LocalTime firstTrip, LocalTime lastTrip, int frequencyMinutes, String daysOperating) {
        setOperatingHours(firstTrip, lastTrip);
        setFrequencyMinutes(frequencyMinutes);
        setDaysOperating(daysOperating);
    }

    // Package-private: called by Route.addSchedule(...)
    void attachTo(Route route) {
        this.route = route;
    }

    public Long getId() {
        return id;
    }

    public Route getRoute() {
        return route;
    }

    public LocalTime getFirstTrip() {
        return firstTrip;
    }

    public LocalTime getLastTrip() {
        return lastTrip;
    }

    /** First and last trip are set together because the first must be earlier than the last. */
    public void setOperatingHours(LocalTime firstTrip, LocalTime lastTrip) {
        ValidationUtils.requireNonNull(firstTrip, "First trip time");
        ValidationUtils.requireNonNull(lastTrip, "Last trip time");
        if (!firstTrip.isBefore(lastTrip)) {
            throw new IllegalArgumentException("First trip must be earlier than the last trip");
        }
        this.firstTrip = firstTrip;
        this.lastTrip = lastTrip;
    }

    public int getFrequencyMinutes() {
        return frequencyMinutes;
    }

    public void setFrequencyMinutes(int frequencyMinutes) {
        this.frequencyMinutes = ValidationUtils.requirePositive(frequencyMinutes, "Frequency");
    }

    public String getDaysOperating() {
        return daysOperating;
    }

    public void setDaysOperating(String daysOperating) {
        this.daysOperating = ValidationUtils.requireNotBlank(daysOperating, "Days operating");
    }
        // ---------- behavior ----------

    /**
     * True when this schedule is running at that moment: on one of its days,
     * from the first trip until the last trip (both included).
     */
    public boolean isOperatingAt(LocalDateTime moment) {
        LocalTime time = moment.toLocalTime();
        return operatingDays().contains(moment.getDayOfWeek())
                && !time.isBefore(firstTrip)
                && !time.isAfter(lastTrip);
    }

    /**
     * The days written in daysOperating, like "MON-SUN", "MON-FRI", "SAT,SUN" or "DAILY".
     * A range can wrap around the week ("FRI-MON"). Text it cannot read counts as
     * every day, so the route then follows its hours only.
     */
    public Set<DayOfWeek> operatingDays() {
        String text = daysOperating.toUpperCase().replace(" ", "");
        if (text.equals("DAILY") || text.equals("EVERYDAY")) {
            return EnumSet.allOf(DayOfWeek.class);
        }
        Set<DayOfWeek> days = EnumSet.noneOf(DayOfWeek.class);
        for (String part : text.split(",")) {
            String[] ends = part.split("-");
            DayOfWeek first = toDay(ends[0]);
            DayOfWeek last = toDay(ends[ends.length - 1]);
            if (ends.length > 2 || first == null || last == null) {
                return EnumSet.allOf(DayOfWeek.class);
            }
            for (DayOfWeek day = first; day != last; day = day.plus(1)) {
                days.add(day);
            }
            days.add(last);
        }
        return days;
    }

    /** "MON" or "MONDAY" becomes MONDAY; anything else gives null. */
    private static DayOfWeek toDay(String text) {
        for (DayOfWeek day : DayOfWeek.values()) {
            if (day.name().equals(text) || day.name().substring(0, 3).equals(text)) {
                return day;
            }
        }
        return null;
    }
}
