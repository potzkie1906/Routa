package com.transithub.entity;

import java.time.Instant;

import com.transithub.entity.enums.Role;
import com.transithub.util.ValidationUtils;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A person who uses routa. The role decides whether they are a normal user or an admin. */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    // Stores the BCrypt HASH of the password, never the password itself
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Role role = Role.USER;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected User() {
    }

    public User(String fullName, String email, String passwordHash, Role role) {
        setFullName(fullName);
        setEmail(email);
        setPasswordHash(passwordHash);
        setRole(role);
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = ValidationUtils.requireNotBlank(fullName, "Full name");
    }

    public String getEmail() {
        return email;
    }

    /** Emails are stored in lowercase so "A@x.com" and "a@x.com" are the same account. */
    public void setEmail(String email) {
        this.email = ValidationUtils.requireNotBlank(email, "Email").toLowerCase();
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = ValidationUtils.requireNotBlank(passwordHash, "Password hash");
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = ValidationUtils.requireNonNull(role, "Role");
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
