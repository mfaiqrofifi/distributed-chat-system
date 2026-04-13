package com.chat.chatservice.consumer;

import com.chat.chatservice.event.MessageDeliveredEvent;
import com.chat.chatservice.service.MessageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class MessageDeliveredEventConsumer {

    private static final Logger logger = LoggerFactory.getLogger(MessageDeliveredEventConsumer.class);

    private final MessageService messageService;

    public MessageDeliveredEventConsumer(MessageService messageService) {
        this.messageService = messageService;
    }

    @RabbitListener(queues = "${chat.messaging.delivered-queue}")
    public void consume(MessageDeliveredEvent event) {
        logger.info(
                "Consumed message.delivered event. messageId={}, receiverId={}, conversationId={}",
                event.messageId(),
                event.receiverId(),
                event.conversationId()
        );

        messageService.markMessageAsDelivered(event);
    }
}
