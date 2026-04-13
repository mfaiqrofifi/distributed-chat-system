package com.chat.chatservice.event;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MessageCreatedEvent(
        UUID messageId,
        String conversationId,
        String senderId,
        String receiverId,
        String content,
        String status,
        OffsetDateTime createdAt
) {
}
