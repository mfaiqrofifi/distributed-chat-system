package com.chat.chatservice.controller;

import com.chat.chatservice.dto.HealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public HealthResponse getHealth() {
        return new HealthResponse(
                "chat-service-java",
                "ok",
                OffsetDateTime.now(ZoneOffset.UTC)
        );
    }
}
