package com.transithub.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import com.transithub.entity.User;
import com.transithub.entity.enums.Role;
import com.transithub.repository.RouteRepository;
import com.transithub.repository.UserRepository;

/**
 * Registration, login, tokens and role-based access, with the REAL security filters switched on.
 * Needs the database. Everything is rolled back after each test.
 */
@SpringBootTest
@Transactional
class AuthSecurityTest {

    private static final String PASSWORD = "Passw0rd-test";

    @Autowired
    private WebApplicationContext context;
    @Autowired
    private FilterChainProxy springSecurityFilterChain;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RouteRepository routeRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtService jwtService;
    @Autowired
    private RateLimiter rateLimiter;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).addFilters(springSecurityFilterChain).build();
        rateLimiter.resetAll(); // every test starts with zero tries
    }

    // ---------------- helpers ----------------

    private User saveUser(String email, Role role) {
        return userRepository.saveAndFlush(new User("Test " + role, email, passwordEncoder.encode(PASSWORD), role));
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user.getId(), user.getEmail());
    }

    private Long anyRouteId() {
        return routeRepository.findAll().get(0).getId();
    }

    private String loginJson(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    private static final String STOP_JSON =
            "{\"name\":\"Security Test Stop\",\"latitude\":13.95,\"longitude\":121.16}";

    // ---------------- registration ----------------

    @Test
    void registerCreatesAUserAndStoresOnlyAHash() throws Exception {
        String json = "{\"fullName\":\"New Person\",\"email\":\"New.Person@Example.com\",\"password\":\"Passw0rd-new\"}";

        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value("new.person@example.com"))
                .andExpect(jsonPath("$.user.role").value("USER"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());

        String stored = userRepository.findByEmail("new.person@example.com").orElseThrow().getPasswordHash();
        assertTrue(stored.startsWith("$2"), "the stored value should be a BCrypt hash");
        assertFalse(stored.contains("Passw0rd-new"), "the password must not be stored as plain text");
    }

    @Test
    void registerRejectsWeakPasswordsAndBadEmails() throws Exception {
        String json = "{\"fullName\":\"X\",\"email\":\"not-an-email\",\"password\":\"short\"}";

        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors[?(@.field=='email')]").exists())
                .andExpect(jsonPath("$.errors[?(@.field=='password')]").exists());

        // long enough, but no number
        String noDigit = "{\"fullName\":\"X\",\"email\":\"x@example.com\",\"password\":\"onlyletters\"}";
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(noDigit))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field=='password')]").exists());
    }

    @Test
    void registerRejectsAnEmailThatAlreadyExists() throws Exception {
        saveUser("taken@example.com", Role.USER);
        String json = "{\"fullName\":\"Copy\",\"email\":\"TAKEN@example.com\",\"password\":\"Passw0rd-new\"}";

        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("An account with this email already exists"));
    }
    @Test
    void registerRejectsAPasswordOver72Bytes() throws Exception {
        // 38 characters, but each ñ takes 2 bytes: 2 + 36 x 2 = 74 bytes
        String json = """
                {"fullName":"Long Password","email":"long@example.com","password":"%s"}
                """.formatted("a1" + "ñ".repeat(36));

        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Password is too long. Accented letters and emoji count as more than one character."));
    }

    // ---------------- login ----------------

    @Test
    void loginWithTheRightPasswordReturnsAToken() throws Exception {
        saveUser("login@example.com", Role.USER);

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("login@example.com", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.user.email").value("login@example.com"));
    }

    @Test
    void loginFailuresAllGiveTheSame401() throws Exception {
        saveUser("exists@example.com", Role.USER);
        User disabled = saveUser("disabled@example.com", Role.USER);
        disabled.setActive(false);
        userRepository.saveAndFlush(disabled);

        String[] attempts = {
                loginJson("exists@example.com", "Wrong-password1"),   // wrong password
                loginJson("nobody@example.com", PASSWORD),            // unknown email
                loginJson("disabled@example.com", PASSWORD)           // account disabled
        };
        for (String attempt : attempts) {
            mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(attempt))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401))
                    .andExpect(jsonPath("$.message").value("Invalid email or password"));
        }
    }
    @Test
    void theSixthLoginTryIn15MinutesGets429() throws Exception {
        saveUser("guessed@example.com", Role.USER);
        String wrong = loginJson("guessed@example.com", "Wrong-password1");
        String right = loginJson("guessed@example.com", PASSWORD);

        for (int i = 1; i <= 5; i++) {
            mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(wrong))
                    .andExpect(status().isUnauthorized());
        }
        // the 6th try is refused, even with the right password
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(right))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.message").value("Too many tries. Please wait 15 minutes and try again."));
    }

    @Test
    void aCorrectLoginStartsTheCountAgain() throws Exception {
        saveUser("forgetful@example.com", Role.USER);
        String wrong = loginJson("forgetful@example.com", "Wrong-password1");
        String right = loginJson("forgetful@example.com", PASSWORD);

        for (int i = 1; i <= 4; i++) {
            mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(wrong))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(right))
                .andExpect(status().isOk());
        // back to zero: 5 more wrong passwords are all a normal 401, not 429
        for (int i = 1; i <= 5; i++) {
            mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(wrong))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ---------------- tokens ----------------

    @Test
    void meReturnsTheLoggedInUser() throws Exception {
        User user = saveUser("me@example.com", Role.USER);

        mockMvc.perform(get("/api/auth/me").header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("me@example.com"));
    }

    @Test
    void missingOrInvalidTokensGet401() throws Exception {
        User user = saveUser("token@example.com", Role.USER);

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication is required"))
                .andExpect(jsonPath("$.path").value("/api/auth/me"));
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer not-a-token"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/auth/me").header("Authorization", bearer(user) + "x"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void theTokenOfADeactivatedUserStopsWorking() throws Exception {
        User user = saveUser("deactivated@example.com", Role.USER);
        String token = bearer(user);

        mockMvc.perform(get("/api/auth/me").header("Authorization", token)).andExpect(status().isOk());

        user.setActive(false);
        userRepository.saveAndFlush(user);
        mockMvc.perform(get("/api/auth/me").header("Authorization", token)).andExpect(status().isUnauthorized());
    }

    // ---------------- who may do what ----------------

    @Test
    void readEndpointsAreOpenToEveryone() throws Exception {
        mockMvc.perform(get("/api/routes")).andExpect(status().isOk());
        mockMvc.perform(get("/api/routes/search").param("origin", "Lipa").param("destination", "Batangas"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/stops")).andExpect(status().isOk());
        mockMvc.perform(get("/api/alerts")).andExpect(status().isOk());
        mockMvc.perform(get("/api/transportations")).andExpect(status().isOk());
        mockMvc.perform(get("/api/stats")).andExpect(status().isOk());
        mockMvc.perform(get("/api/health")).andExpect(status().isOk());
    }

    @Test
    void writingNeedsAnAdmin() throws Exception {
        User user = saveUser("plain@example.com", Role.USER);
        User admin = saveUser("boss@example.com", Role.ADMIN);

        // not logged in
        mockMvc.perform(post("/api/stops").contentType(MediaType.APPLICATION_JSON).content(STOP_JSON))
                .andExpect(status().isUnauthorized());

        // logged in as a normal user
        mockMvc.perform(post("/api/stops").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content(STOP_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("You do not have permission to do this"));
        mockMvc.perform(delete("/api/routes/" + anyRouteId()).header("Authorization", bearer(user)))
                .andExpect(status().isForbidden());

        // logged in as an admin
        mockMvc.perform(post("/api/stops").header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content(STOP_JSON))
                .andExpect(status().isCreated());
    }

    @Test
    void adminAreaIsForAdminsOnly() throws Exception {
        User user = saveUser("plain2@example.com", Role.USER);
        User admin = saveUser("boss2@example.com", Role.ADMIN);

        mockMvc.perform(get("/api/admin/stats")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/stats").header("Authorization", bearer(user))).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/stats").header("Authorization", bearer(admin))).andExpect(status().isOk());
    }

    // ---------------- favorites and reports ----------------

    @Test
    void favoritesBelongToTheLoggedInUser() throws Exception {
        User first = saveUser("fav1@example.com", Role.USER);
        User second = saveUser("fav2@example.com", Role.USER);
        Long routeId = anyRouteId();

        mockMvc.perform(get("/api/favorites")).andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/favorites/" + routeId).header("Authorization", bearer(first)))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/favorites/" + routeId).header("Authorization", bearer(first)))
                .andExpect(status().isConflict());
        mockMvc.perform(get("/api/favorites").header("Authorization", bearer(first)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        // another user does not see it
        mockMvc.perform(get("/api/favorites").header("Authorization", bearer(second)))
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(delete("/api/favorites/" + routeId).header("Authorization", bearer(first)))
                .andExpect(status().isNoContent());
    }

    @Test
    void usersReportAndAdminsReview() throws Exception {
        User user = saveUser("reporter@example.com", Role.USER);
        User admin = saveUser("reviewer@example.com", Role.ADMIN);
        String json = "{\"routeId\":" + anyRouteId() + ",\"description\":\"The fare is wrong\"}";

        mockMvc.perform(post("/api/reports").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/reports").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reportedBy").value("reporter@example.com"))
                .andExpect(jsonPath("$.status").value("OPEN"));

        mockMvc.perform(get("/api/reports/mine").header("Authorization", bearer(user)))
                .andExpect(jsonPath("$.length()").value(1));

        // a normal user cannot read the admin list; an admin can
        mockMvc.perform(get("/api/admin/reports").header("Authorization", bearer(user)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/reports").param("status", "OPEN").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].description").exists());
    }

    // ---------------- user management ----------------

    @Test
    void adminCanSearchDeactivateAndPromoteUsers() throws Exception {
        User admin = saveUser("manager@example.com", Role.ADMIN);
        User target = saveUser("target@example.com", Role.USER);

        mockMvc.perform(get("/api/admin/users").param("search", "target@").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].email").value("target@example.com"));

        mockMvc.perform(patch("/api/admin/users/" + target.getId() + "/role")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));

        mockMvc.perform(patch("/api/admin/users/" + target.getId() + "/active")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        // the deactivated user can no longer log in
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("target@example.com", PASSWORD)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anAdminCannotLockThemselvesOut() throws Exception {
        User admin = saveUser("selfadmin@example.com", Role.ADMIN);

        mockMvc.perform(patch("/api/admin/users/" + admin.getId() + "/active")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("You cannot deactivate your own account"));

        mockMvc.perform(patch("/api/admin/users/" + admin.getId() + "/role")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"USER\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("You cannot remove your own admin role"));
    }
}
