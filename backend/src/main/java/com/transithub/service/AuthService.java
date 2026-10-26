package com.transithub.service;

import java.nio.charset.StandardCharsets;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.transithub.dto.request.LoginRequest;
import com.transithub.dto.request.RegisterRequest;
import com.transithub.dto.response.AuthResponse;
import com.transithub.dto.response.UserResponse;
import com.transithub.entity.User;
import com.transithub.entity.enums.Role;
import com.transithub.exception.DuplicateResourceException;
import com.transithub.exception.InvalidRequestException;
import com.transithub.exception.ResourceNotFoundException;
import com.transithub.exception.UnauthorizedException;
import com.transithub.mapper.UserMapper;
import com.transithub.repository.UserRepository;
import com.transithub.security.JwtService;

@Service
public class AuthService {
    // BCrypt (the password hashing) only works with passwords of up to 72 bytes
    private static final int BCRYPT_MAX_BYTES = 72;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserMapper userMapper;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       UserMapper userMapper) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userMapper = userMapper;
    }

        /** Creates a normal USER account. Nobody can register as ADMIN. */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // @Size in RegisterRequest counts characters, but BCrypt counts bytes:
        // a plain letter is 1 byte, an accented letter 2 and an emoji 4.
        if (request.password().getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_BYTES) {
            throw new InvalidRequestException(
                    "Password is too long. Accented letters and emoji count as more than one character.");
        }
        String email = normalize(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("An account with this email already exists");
        }
        // only the BCrypt hash is stored, never the password
        User user = userRepository.save(
                new User(request.fullName(), email, passwordEncoder.encode(request.password()), Role.USER));
        return buildResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = normalize(request.email());
        try {
            // Spring Security finds the user and compares the password with the stored hash
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        } catch (AuthenticationException e) {
            // Same message for "unknown email", "wrong password" and "account disabled",
            // so an attacker cannot learn which emails have accounts.
            throw new UnauthorizedException("Invalid email or password");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));
        return buildResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Long userId) {
        return userMapper.toResponse(userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId)));
    }

    private AuthResponse buildResponse(User user) {
        String token = jwtService.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(token, "Bearer", jwtService.getExpirationSeconds(), userMapper.toResponse(user));
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase();
    }
}
