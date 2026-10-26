package com.transithub.controller;

import java.time.Duration;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transithub.dto.request.ReportRequest;
import com.transithub.dto.response.ReportResponse;
import com.transithub.security.AuthenticatedUser;
import com.transithub.security.RateLimiter;
import com.transithub.service.ReportService;

import jakarta.validation.Valid;

/** A logged-in user reports incorrect route information. Admins review reports in /api/admin/reports. */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    // 10 reports per user every hour
    private static final int MAX_REPORTS = 10;
    private static final Duration REPORT_WINDOW = Duration.ofHours(1);

    private final ReportService reportService;
    private final RateLimiter rateLimiter;

    public ReportController(ReportService reportService, RateLimiter rateLimiter) {
        this.reportService = reportService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping
    public ResponseEntity<ReportResponse> submitReport(@AuthenticationPrincipal AuthenticatedUser currentUser,
                                                       @Valid @RequestBody ReportRequest request) {
        rateLimiter.hit("report:" + currentUser.id(), MAX_REPORTS, REPORT_WINDOW);
        return ResponseEntity.status(HttpStatus.CREATED).body(reportService.submitReport(currentUser.id(), request));
    }

    /** The reports I sent. */
    @GetMapping("/mine")
    public List<ReportResponse> getMyReports(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        return reportService.getMyReports(currentUser.id());
    }
}