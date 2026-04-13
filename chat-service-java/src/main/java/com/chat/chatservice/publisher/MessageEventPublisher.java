package com.chat.chatservice.publisher;

import com.chat.chatservice.config.RabbitMqProperties;
import com.chat.chatservice.event.MessageCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class MessageEventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(MessageEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final RabbitMqProperties rabbitMqProperties;

    public MessageEventPublisher(RabbitTemplate rabbitTemplate, RabbitMqProperties rabbitMqProperties) {
        this.rabbitTemplate = rabbitTemplate;
        this.rabbitMqProperties = rabbitMqProperties;
    }

    public void publishMessageCreated(MessageCreatedEvent event) {
        rabbitTemplate.convertAndSend(
                rabbitMqProperties.getExchange(),
                rabbitMqProperties.getRoutingKey(),
                event
        );

        logger.info(
                "Published message.created event. messageId={}, conversationId={}, routingKey={}",
                event.messageId(),
                event.conversationId(),
                rabbitMqProperties.getRoutingKey()
        );
    }
}
