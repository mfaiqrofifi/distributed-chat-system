package com.chat.chatservice.service;

import com.chat.chatservice.dto.CreateMessageRequest;
import com.chat.chatservice.dto.MessageResponse;
import com.chat.chatservice.entity.Message;
import com.chat.chatservice.event.MessageCreatedEvent;
import com.chat.chatservice.event.MessageDeliveredEvent;
import com.chat.chatservice.event.MessageReadEvent;
import com.chat.chatservice.publisher.MessageEventPublisher;
import com.chat.chatservice.repository.MessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MessageService {

    private static final Logger logger = LoggerFactory.getLogger(MessageService.class);

    private final MessageRepository messageRepository;
    private final MessageEventPublisher messageEventPublisher;

    public MessageService(
            MessageRepository messageRepository,
            MessageEventPublisher messageEventPublisher
    ) {
        this.messageRepository = messageRepository;
        this.messageEventPublisher = messageEventPublisher;
    }

    @Transactional
    public MessageResponse createMessage(CreateMessageRequest request) {
        Message message = new Message();
        message.setConversationId(request.conversationId());
        message.setSenderId(request.senderId());
        message.setReceiverId(request.receiverId());
        message.setContent(request.content());
        message.setStatus("sent");

        Message savedMessage = messageRepository.saveAndFlush(message);

        logger.info(
                "Saved message. id={}, conversationId={}, senderId={}, receiverId={}",
                savedMessage.getId(),
                savedMessage.getConversationId(),
                savedMessage.getSenderId(),
                savedMessage.getReceiverId()
        );

        messageEventPublisher.publishMessageCreated(new MessageCreatedEvent(
                savedMessage.getId(),
                savedMessage.getConversationId(),
                savedMessage.getSenderId(),
                savedMessage.getReceiverId(),
                savedMessage.getContent(),
                savedMessage.getStatus(),
                savedMessage.getCreatedAt()
        ));

        return toResponse(savedMessage);
    }

    public List<MessageResponse> getConversationMessages(String conversationId) {
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void markMessageAsDelivered(MessageDeliveredEvent event) {
        Optional<Message> optionalMessage = messageRepository.findById(event.messageId());

        if (optionalMessage.isEmpty()) {
            logger.warn(
                    "Delivered event ignored because message was not found. messageId={}, conversationId={}",
                    event.messageId(),
                    event.conversationId()
            );
            return;
        }

        Message message = optionalMessage.get();

        if ("delivered".equalsIgnoreCase(message.getStatus())) {
            logger.info(
                    "Delivered event ignored because message already delivered. messageId={}, conversationId={}",
                    message.getId(),
                    message.getConversationId()
            );
            return;
        }

        message.setStatus("delivered");
        messageRepository.save(message);

        logger.info(
                "Message status updated to delivered. messageId={}, conversationId={}, receiverId={}, deliveredAt={}",
                message.getId(),
                message.getConversationId(),
                message.getReceiverId(),
                event.deliveredAt()
        );
    }

    @Transactional
    public void markMessagesAsRead(MessageReadEvent event) {
        if (event.messageIds() == null || event.messageIds().isEmpty()) {
            logger.warn(
                    "Read event ignored because no message ids were provided. conversationId={}, readerId={}",
                    event.conversationId(),
                    event.readerId()
            );
            return;
        }

        int updatedCount = 0;

        for (String rawMessageId : event.messageIds()) {
            UUID messageId;

            try {
                messageId = UUID.fromString(rawMessageId);
            } catch (IllegalArgumentException exception) {
                logger.warn(
                        "Read event ignored invalid message id. messageId={}, conversationId={}, readerId={}",
                        rawMessageId,
                        event.conversationId(),
                        event.readerId()
                );
                continue;
            }

            Optional<Message> optionalMessage = messageRepository.findById(messageId);

            if (optionalMessage.isEmpty()) {
                logger.warn(
                        "Read event ignored because message was not found. messageId={}, conversationId={}, readerId={}",
                        messageId,
                        event.conversationId(),
                        event.readerId()
                );
                continue;
            }

            Message message = optionalMessage.get();

            if ("read".equalsIgnoreCase(message.getStatus())) {
                logger.info(
                        "Read event ignored because message already read. messageId={}, conversationId={}",
                        message.getId(),
                        message.getConversationId()
                );
                continue;
            }

            message.setStatus("read");
            messageRepository.save(message);
            updatedCount++;

            logger.info(
                    "Message status updated to read. messageId={}, conversationId={}, readerId={}, readAt={}",
                    message.getId(),
                    message.getConversationId(),
                    event.readerId(),
                    event.readAt()
            );
        }

        logger.info(
                "Finished processing read event. conversationId={}, readerId={}, updatedCount={}",
                event.conversationId(),
                event.readerId(),
                updatedCount
        );
    }

    private MessageResponse toResponse(Message message) {
        return new MessageResponse(
                message.getId(),
                message.getConversationId(),
                message.getSenderId(),
                message.getReceiverId(),
                message.getContent(),
                message.getStatus(),
                message.getCreatedAt()
        );
    }
}
