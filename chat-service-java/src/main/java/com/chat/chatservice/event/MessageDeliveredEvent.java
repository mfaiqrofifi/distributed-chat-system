package com.chat.chatservice.event;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MessageDeliveredEvent(
        UUID messageId,
        String conversationId,
        String senderId,
        String receiverId,
        OffsetDateTime deliveredAt
) {
}
