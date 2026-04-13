package com.chat.chatservice.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.AmqpAdmin;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(RabbitMqProperties.class)
public class RabbitMqConfig {

    private static final Logger logger = LoggerFactory.getLogger(RabbitMqConfig.class);

    @Bean
    public DirectExchange chatExchange(RabbitMqProperties properties) {
        return new DirectExchange(properties.getExchange(), true, false);
    }

    @Bean
    public Queue messageCreatedQueue(RabbitMqProperties properties) {
        return new Queue(properties.getQueue(), true);
    }

    @Bean
    public Queue messageDeliveredQueue(RabbitMqProperties properties) {
        return new Queue(properties.getDeliveredQueue(), true);
    }

    @Bean
    public Queue messageReadQueue(RabbitMqProperties properties) {
        return new Queue(properties.getReadQueue(), true);
    }

    @Bean
    public Binding messageCreatedBinding(
            Queue messageCreatedQueue,
            DirectExchange chatExchange,
            RabbitMqProperties properties
    ) {
        return BindingBuilder.bind(messageCreatedQueue)
                .to(chatExchange)
                .with(properties.getRoutingKey());
    }

    @Bean
    public Binding messageDeliveredBinding(
            Queue messageDeliveredQueue,
            DirectExchange chatExchange,
            RabbitMqProperties properties
    ) {
        return BindingBuilder.bind(messageDeliveredQueue)
                .to(chatExchange)
                .with(properties.getDeliveredRoutingKey());
    }

    @Bean
    public Binding messageReadBinding(
            Queue messageReadQueue,
            DirectExchange chatExchange,
            RabbitMqProperties properties
    ) {
        return BindingBuilder.bind(messageReadQueue)
                .to(chatExchange)
                .with(properties.getReadRoutingKey());
    }

    @Bean
    public Declarables chatMessagingDeclarables(
            DirectExchange chatExchange,
            Queue messageCreatedQueue,
            Binding messageCreatedBinding,
            Queue messageDeliveredQueue,
            Binding messageDeliveredBinding,
            Queue messageReadQueue,
            Binding messageReadBinding
    ) {
        return new Declarables(
                chatExchange,
                messageCreatedQueue,
                messageCreatedBinding,
                messageDeliveredQueue,
                messageDeliveredBinding,
                messageReadQueue,
                messageReadBinding
        );
    }

    @Bean
    public AmqpAdmin amqpAdmin(ConnectionFactory connectionFactory) {
        RabbitAdmin rabbitAdmin = new RabbitAdmin(connectionFactory);
        rabbitAdmin.setAutoStartup(true);
        return rabbitAdmin;
    }

    @Bean
    public ApplicationRunner rabbitDeclarationVerifier(
            AmqpAdmin amqpAdmin,
            DirectExchange chatExchange,
            Queue messageCreatedQueue,
            Binding messageCreatedBinding,
            Queue messageDeliveredQueue,
            Binding messageDeliveredBinding,
            Queue messageReadQueue,
            Binding messageReadBinding
    ) {
        return args -> {
            final int maxAttempts = 10;

            for (int attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    amqpAdmin.declareExchange(chatExchange);
                    amqpAdmin.declareQueue(messageCreatedQueue);
                    amqpAdmin.declareBinding(messageCreatedBinding);
                    amqpAdmin.declareQueue(messageDeliveredQueue);
                    amqpAdmin.declareBinding(messageDeliveredBinding);
                    amqpAdmin.declareQueue(messageReadQueue);
                    amqpAdmin.declareBinding(messageReadBinding);

                    logger.info(
                            "RabbitMQ topology declared. exchange={}, createdQueue={}, createdRoutingKey={}, deliveredQueue={}, deliveredRoutingKey={}, readQueue={}, readRoutingKey={}",
                            chatExchange.getName(),
                            messageCreatedQueue.getName(),
                            messageCreatedBinding.getRoutingKey(),
                            messageDeliveredQueue.getName(),
                            messageDeliveredBinding.getRoutingKey(),
                            messageReadQueue.getName(),
                            messageReadBinding.getRoutingKey()
                    );

                    return;
                } catch (Exception exception) {
                    if (attempt == maxAttempts) {
                        logger.warn(
                                "RabbitMQ topology declaration is still unavailable after {} attempts. App will continue and listener/publisher retries will handle broker recovery.",
                                maxAttempts,
                                exception
                        );
                        return;
                    }

                    logger.warn(
                            "RabbitMQ topology declaration attempt {} of {} failed. Retrying in 2 seconds.",
                            attempt,
                            maxAttempts,
                            exception
                    );

                    Thread.sleep(2000);
                }
            }
        };
    }

    @Bean
    public Jackson2JsonMessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
