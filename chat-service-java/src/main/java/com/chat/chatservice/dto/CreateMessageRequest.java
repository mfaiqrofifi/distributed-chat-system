package com.chat.chatservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateMessageRequest(
        @NotBlank(message = "conversationId is required")
        String conversationId,

        @NotBlank(message = "senderId is required")
        String senderId,

        @NotBlank(message = "receiverId is required")
        String receiverId,

        @NotBlank(message = "content is required")
        @Size(max = 4000, message = "content must be at most 4000 characters")
        String content
) {
}
