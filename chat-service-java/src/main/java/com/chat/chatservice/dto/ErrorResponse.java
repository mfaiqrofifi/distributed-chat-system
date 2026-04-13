package com.chat.chatservice.dto;

import java.time.OffsetDateTime;

public record ErrorResponse(
        String message,
        OffsetDateTime timestamp
) {
}
