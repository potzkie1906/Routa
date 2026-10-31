package com.transithub.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The clock the app reads "now" from. Operating hours are Philippine time,
 * so we use Asia/Manila even when the server or Docker runs in another time zone.
 */
@Configuration
public class ClockConfig {

    public static final ZoneId PHILIPPINE_TIME = ZoneId.of("Asia/Manila");

    @Bean
    public Clock clock() {
        return Clock.system(PHILIPPINE_TIME);
    }
}