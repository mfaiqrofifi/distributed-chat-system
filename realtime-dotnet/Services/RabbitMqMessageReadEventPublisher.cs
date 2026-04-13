using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using realtime_dotnet.Configurations;
using realtime_dotnet.Models.Realtime;

namespace realtime_dotnet.Services;

public sealed class RabbitMqMessageReadEventPublisher(
    IOptions<RabbitMqOptions> rabbitMqOptions,
    ILogger<RabbitMqMessageReadEventPublisher> logger) : IMessageReadEventPublisher
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public Task PublishAsync(MessageReadEvent messageReadEvent, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var options = rabbitMqOptions.Value;

        var factory = new ConnectionFactory
        {
            HostName = options.Host,
            Port = options.Port,
            UserName = options.Username,
            Password = options.Password
        };

        using var connection = factory.CreateConnection();
        using var channel = connection.CreateModel();

        channel.ExchangeDeclare(
            exchange: options.Exchange,
            type: ExchangeType.Direct,
            durable: true,
            autoDelete: false);
        channel.QueueDeclare(
            queue: options.ReadQueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null);
        channel.QueueBind(
            queue: options.ReadQueueName,
            exchange: options.Exchange,
            routingKey: options.ReadRoutingKey);

        var payload = JsonSerializer.Serialize(messageReadEvent, JsonOptions);
        var body = Encoding.UTF8.GetBytes(payload);

        var properties = channel.CreateBasicProperties();
        properties.Persistent = true;
        properties.ContentType = "application/json";

        channel.BasicPublish(
            exchange: options.Exchange,
            routingKey: options.ReadRoutingKey,
            basicProperties: properties,
            body: body);

        logger.LogInformation(
            "Published message.read event. readerId={ReaderId}, conversationId={ConversationId}, messageCount={MessageCount}, routingKey={RoutingKey}",
            messageReadEvent.ReaderId,
            messageReadEvent.ConversationId,
            messageReadEvent.MessageIds.Count,
            options.ReadRoutingKey);

        return Task.CompletedTask;
    }
}
