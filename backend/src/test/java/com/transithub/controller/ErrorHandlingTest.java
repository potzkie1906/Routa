package com.transithub.controller;

import com.transithub.repository.RouteRepository;
import com.transithub.repository.StopRepository;
import com.transithub.repository.TransportationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Checks that every kind of error comes back in the same JSON format:
 * {"status": ..., "message": ..., "timestamp": ..., "path": ..., "errors": [...]}
 */
@SpringBootTest
@Transactional
class ErrorHandlingTest {

    @Autowired
    private WebApplicationContext context;
    @Autowired
    private RouteRepository routeRepository;
    @Autowired
    private StopRepository stopRepository;
    @Autowired
    private TransportationRepository transportationRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
    }

    private String routeJson(String code, String origin, String destination, String stops) {
        Long transportationId = transportationRepository.findAll().get(0).getId();
        return """
                {"routeCode":"%s","routeName":"Error Test Route","origin":"%s","destination":"%s",
                 "status":"ACTIVE","estimatedMinutes":30,"distanceKm":10.0,"transportationId":%d,
                 "fare":{"baseFare":15.00,"perKmRate":1.00},"stops":%s}
                """.formatted(code, origin, destination, transportationId, stops);
    }

    private String twoStops() {
        Long stopA = stopRepository.findAll().get(0).getId();
        Long stopB = stopRepository.findAll().get(1).getId();
        return "[{\"stopId\":" + stopA + ",\"minutesFromStart\":0},{\"stopId\":" + stopB + ",\"minutesFromStart\":30}]";
    }

    // ---------------- 404 ----------------

    @Test
    void unknownRouteReturnsA404InTheStandardFormat() throws Exception {
        mockMvc.perform(get("/api/routes/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Route not found with id 999999"))
                .andExpect(jsonPath("$.path").value("/api/routes/999999"))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.errors.length()").value(0));
    }

    @Test
    void unknownStopTransportationAndAlertAreAlso404() throws Exception {
        mockMvc.perform(get("/api/stops/999999")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/transportations/999999")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/alerts/999999")).andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/routes/999999")).andExpect(status().isNotFound());
    }

    @Test
    void unknownUrlReturns404() throws Exception {
        mockMvc.perform(get("/api/does-not-exist")).andExpect(status().isNotFound());
    }

    // ---------------- 409 ----------------

    @Test
    void duplicateRouteCodeReturns409() throws Exception {
        mockMvc.perform(post("/api/routes").contentType(MediaType.APPLICATION_JSON)
                        .content(routeJson("LB-JEEP-01", "Alpha", "Beta", twoStops())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("A route with code LB-JEEP-01 already exists"));
    }

    @Test
    void deletingAStopThatARouteUsesReturns409() throws Exception {
        Long ibaanId = stopRepository.findByNameContainingIgnoreCase("Ibaan").get(0).getId();
        mockMvc.perform(delete("/api/stops/" + ibaanId))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").exists());
    }

    // ---------------- 400: validation ----------------

    @Test
    void validationErrorsListEveryInvalidField() throws Exception {
        String json = "{\"name\":\" \",\"latitude\":95,\"longitude\":300}";

        mockMvc.perform(post("/api/stops").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.path").value("/api/stops"))
                .andExpect(jsonPath("$.errors.length()").value(3))
                .andExpect(jsonPath("$.errors[?(@.field=='name')]").exists())
                .andExpect(jsonPath("$.errors[?(@.field=='latitude' && @.message=='Latitude must be between -90 and 90')]").exists())
                .andExpect(jsonPath("$.errors[?(@.field=='longitude')]").exists());
    }

    @Test
    void nestedFieldsAreNamedWithTheirFullPath() throws Exception {
        // negative fare inside "fare"
        String json = """
                {"routeCode":"E-1","routeName":"X","origin":"A","destination":"B","status":"ACTIVE",
                 "estimatedMinutes":30,"distanceKm":10.0,"transportationId":1,
                 "fare":{"baseFare":-5.00,"perKmRate":1.00},
                 "stops":[{"stopId":1,"minutesFromStart":0},{"stopId":2,"minutesFromStart":10}]}
                """;
        mockMvc.perform(post("/api/routes").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field=='fare.baseFare')]").exists());
    }

    // ---------------- 400: other bad requests ----------------

    @Test
    void malformedJsonReturns400() throws Exception {
        mockMvc.perform(post("/api/stops").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void unknownEnumValueReturns400() throws Exception {
        String json = "{\"title\":\"Bad\",\"message\":\"temp\",\"severity\":\"PURPLE\"}";
        mockMvc.perform(post("/api/alerts").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void wrongParameterTypeReturns400() throws Exception {
        mockMvc.perform(get("/api/routes").param("status", "FLYING"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Parameter 'status' has an invalid value"));
    }

    @Test
    void missingParameterReturns400() throws Exception {
        mockMvc.perform(get("/api/routes/search").param("origin", "Lipa"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void businessRuleBrokenInAServiceReturns400() throws Exception {
        // only one stop: passes the DTO check, but the route rule "at least 2 stops" rejects it
        Long stopId = stopRepository.findAll().get(0).getId();
        String oneStop = "[{\"stopId\":" + stopId + ",\"minutesFromStart\":0}]";

        mockMvc.perform(post("/api/routes").contentType(MediaType.APPLICATION_JSON)
                        .content(routeJson("E-ONE-STOP", "Alpha", "Beta", oneStop)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A route needs at least 2 stops"));
    }

    @Test
    void ruleBrokenInAnEntityReturns400() throws Exception {
        // origin and destination are the same: rejected by Route.setEndpoints
        mockMvc.perform(post("/api/routes").contentType(MediaType.APPLICATION_JSON)
                        .content(routeJson("E-SAME", "Lipa", "lipa", twoStops())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Origin and destination must be different"));
    }

    @Test
    void searchWithTheSamePlaceTwiceReturns400() throws Exception {
        mockMvc.perform(get("/api/routes/search").param("origin", "Lipa").param("destination", "lipa"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Origin and destination must be different"));
    }
    @Test
    void searchTextLongerThan100CharactersReturns400() throws Exception {
        mockMvc.perform(get("/api/routes/search").param("origin", "a".repeat(101)).param("destination", "Batangas"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Origin and destination must be at most 100 characters"));
    }

    @Test
    void invalidNearbySearchReturns400() throws Exception {
        mockMvc.perform(get("/api/stops/nearby").param("lat", "95").param("lng", "121"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Latitude must be between -90 and 90"));
    }

    // ---------------- 405 / 415 ----------------

    @Test
    void wrongHttpMethodReturns405() throws Exception {
        mockMvc.perform(delete("/api/stats"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405));
    }

    @Test
    void wrongContentTypeReturns415() throws Exception {
        mockMvc.perform(post("/api/stops").contentType(MediaType.TEXT_PLAIN).content("hello"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.status").value(415));
    }

    // routeRepository is only here to make sure the demo data exists
    @Test
    void demoDataIsLoaded() {
        org.junit.jupiter.api.Assertions.assertTrue(routeRepository.count() > 0, "load database/seed/sample-data.sql first");
    }
}
