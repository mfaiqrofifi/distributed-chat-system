package com.chat.chatservice.event;

import java.time.OffsetDateTime;
import java.util.List;

public record MessageReadEvent(
        String conversationId,
        String readerId,
        List<String> messageIds,
        OffsetDateTime readAt
) {
}
