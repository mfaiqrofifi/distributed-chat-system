package com.chat.chatservice.consumer;

import com.chat.chatservice.event.MessageReadEvent;
import com.chat.chatservice.service.MessageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class MessageReadEventConsumer {

    private static final Logger logger = LoggerFactory.getLogger(MessageReadEventConsumer.class);

    private final MessageService messageService;

    public MessageReadEventConsumer(MessageService messageService) {
        this.messageService = messageService;
    }

    @RabbitListener(queues = "${chat.messaging.read-queue}")
    public void consume(MessageReadEvent event) {
        int messageCount = event.messageIds() == null ? 0 : event.messageIds().size();

        logger.info(
                "Consumed message.read event. readerId={}, conversationId={}, messageCount={}",
                event.readerId(),
                event.conversationId(),
                messageCount
        );

        messageService.markMessagesAsRead(event);
    }
}
