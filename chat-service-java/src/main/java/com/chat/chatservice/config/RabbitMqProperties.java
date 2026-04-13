package com.chat.chatservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "chat.messaging")
public class RabbitMqProperties {

    private String exchange = "chat.exchange";
    private String queue = "chat.message.created.queue";
    private String routingKey = "message.created";
    private String deliveredQueue = "chat.message.delivered.queue";
    private String deliveredRoutingKey = "message.delivered";
    private String readQueue = "chat.message.read.queue";
    private String readRoutingKey = "message.read";

    public String getExchange() {
        return exchange;
    }

    public void setExchange(String exchange) {
        this.exchange = exchange;
    }

    public String getQueue() {
        return queue;
    }

    public void setQueue(String queue) {
        this.queue = queue;
    }

    public String getRoutingKey() {
        return routingKey;
    }

    public void setRoutingKey(String routingKey) {
        this.routingKey = routingKey;
    }

    public String getDeliveredQueue() {
        return deliveredQueue;
    }

    public void setDeliveredQueue(String deliveredQueue) {
        this.deliveredQueue = deliveredQueue;
    }

    public String getDeliveredRoutingKey() {
        return deliveredRoutingKey;
    }

    public void setDeliveredRoutingKey(String deliveredRoutingKey) {
        this.deliveredRoutingKey = deliveredRoutingKey;
    }

    public String getReadQueue() {
        return readQueue;
    }

    public void setReadQueue(String readQueue) {
        this.readQueue = readQueue;
    }

    public String getReadRoutingKey() {
        return readRoutingKey;
    }

    public void setReadRoutingKey(String readRoutingKey) {
        this.readRoutingKey = readRoutingKey;
    }
}
