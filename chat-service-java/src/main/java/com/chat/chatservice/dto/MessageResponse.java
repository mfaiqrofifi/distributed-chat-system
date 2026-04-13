package com.chat.chatservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MessageResponse(
        UUID id,
        String conversationId,
        String senderId,
        String receiverId,
        String content,
        String status,
        OffsetDateTime createdAt
) {
}
