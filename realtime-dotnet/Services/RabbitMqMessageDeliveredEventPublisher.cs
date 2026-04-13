using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using realtime_dotnet.Configurations;
using realtime_dotnet.Models.Realtime;

namespace realtime_dotnet.Services;

public sealed class RabbitMqMessageDeliveredEventPublisher(
    IOptions<RabbitMqOptions> rabbitMqOptions,
    ILogger<RabbitMqMessageDeliveredEventPublisher> logger) : IMessageDeliveredEventPublisher
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public Task PublishAsync(MessageDeliveredEvent messageDeliveredEvent, CancellationToken cancellationToken)
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
            queue: options.DeliveredQueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null);
        channel.QueueBind(
            queue: options.DeliveredQueueName,
            exchange: options.Exchange,
            routingKey: options.DeliveredRoutingKey);

        var payload = JsonSerializer.Serialize(messageDeliveredEvent, JsonOptions);
        var body = Encoding.UTF8.GetBytes(payload);

        var properties = channel.CreateBasicProperties();
        properties.Persistent = true;
        properties.ContentType = "application/json";

        channel.BasicPublish(
            exchange: options.Exchange,
            routingKey: options.DeliveredRoutingKey,
            basicProperties: properties,
            body: body);

        logger.LogInformation(
            "Published message.delivered event. messageId={MessageId}, receiverId={ReceiverId}, routingKey={RoutingKey}",
            messageDeliveredEvent.MessageId,
            messageDeliveredEvent.ReceiverId,
            options.DeliveredRoutingKey);

        return Task.CompletedTask;
    }
}
