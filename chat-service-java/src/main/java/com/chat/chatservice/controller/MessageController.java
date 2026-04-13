package com.chat.chatservice.controller;

import com.chat.chatservice.dto.CreateMessageRequest;
import com.chat.chatservice.dto.MessageResponse;
import com.chat.chatservice.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse createMessage(@Valid @RequestBody CreateMessageRequest request) {
        return messageService.createMessage(request);
    }

    @GetMapping("/conversation/{conversationId}")
    public List<MessageResponse> getConversationMessages(@PathVariable String conversationId) {
        return messageService.getConversationMessages(conversationId);
    }
}
