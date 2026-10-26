package com.transithub.controller;

import java.time.Duration;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transithub.dto.request.LoginRequest;
import com.transithub.dto.request.RegisterRequest;
import com.transithub.dto.response.AuthResponse;
import com.transithub.dto.response.UserResponse;
import com.transithub.security.AuthenticatedUser;
import com.transithub.security.RateLimiter;
import com.transithub.service.AuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    // Log in: 5 tries per email every 15 minutes. A correct login starts the count again.
    private static final int MAX_LOGIN_TRIES = 5;
    private static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);

    // Sign up: 10 tries per network address every hour.
    private static final int MAX_SIGN_UP_TRIES = 10;
    private static final Duration SIGN_UP_WINDOW = Duration.ofHours(1);

    private final AuthService authService;
    private final RateLimiter rateLimiter;

    public AuthController(AuthService authService, RateLimiter rateLimiter) {
        this.authService = authService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
                                                 HttpServletRequest httpRequest) {
        rateLimiter.hit("register:" + httpRequest.getRemoteAddr(), MAX_SIGN_UP_TRIES, SIGN_UP_WINDOW);
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        String key = "login:" + request.email().trim().toLowerCase();
        rateLimiter.hit(key, MAX_LOGIN_TRIES, LOGIN_WINDOW);
        AuthResponse response = authService.login(request); // a wrong password stops here with 401
        rateLimiter.reset(key);                              // right password: the count starts again
        return response;
    }

    /** The logged-in user's own details. */
    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        return authService.getCurrentUser(currentUser.id());
    }
}