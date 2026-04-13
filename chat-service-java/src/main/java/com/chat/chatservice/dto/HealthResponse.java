package com.chat.chatservice.dto;

import java.time.OffsetDateTime;

public record HealthResponse(
        String service,
        String status,
        OffsetDateTime timestamp
) {
}
