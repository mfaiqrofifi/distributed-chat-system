using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using realtime_dotnet.Configurations;
using realtime_dotnet.Models.Realtime;

namespace realtime_dotnet.Services;

public sealed class RabbitMqMessageConsumerService(
    IOptions<RabbitMqOptions> rabbitMqOptions,
    IRealtimeMessageDispatcher dispatcher,
    ILogger<RabbitMqMessageConsumerService> logger) : BackgroundService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("RabbitMQ consumer starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            IConnection? connection = null;
            IModel? channel = null;

            try
            {
                var options = rabbitMqOptions.Value;

                var factory = new ConnectionFactory
                {
                    HostName = options.Host,
                    Port = options.Port,
                    UserName = options.Username,
                    Password = options.Password,
                    DispatchConsumersAsync = true,
                    AutomaticRecoveryEnabled = true
                };

                connection = factory.CreateConnection();
                channel = connection.CreateModel();
                channel.BasicQos(prefetchSize: 0, prefetchCount: 1, global: false);
                channel.ExchangeDeclare(
                    exchange: options.Exchange,
                    type: ExchangeType.Direct,
                    durable: true,
                    autoDelete: false);
                channel.QueueDeclare(
                    queue: options.QueueName,
                    durable: true,
                    exclusive: false,
                    autoDelete: false,
                    arguments: null);
                channel.QueueBind(
                    queue: options.QueueName,
                    exchange: options.Exchange,
                    routingKey: options.RoutingKey);

                logger.LogInformation(
                    "RabbitMQ connection established. host={Host}, port={Port}, exchange={Exchange}, queue={QueueName}, routingKey={RoutingKey}",
                    options.Host,
                    options.Port,
                    options.Exchange,
                    options.QueueName,
                    options.RoutingKey);

                var consumer = new AsyncEventingBasicConsumer(channel);
                consumer.Received += async (_, eventArgs) =>
                {
                    await HandleMessageAsync(channel, eventArgs, stoppingToken);
                };

                // Manual ack is used so we only acknowledge after the message has been
                // deserialized and the realtime push attempt has completed.
                channel.BasicConsume(
                    queue: options.QueueName,
                    autoAck: false,
                    consumer: consumer);

                await WaitUntilStoppedAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "RabbitMQ consumer loop failed. Retrying in 5 seconds.");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
            finally
            {
                channel?.Dispose();
                connection?.Dispose();
            }
        }
    }

    private async Task HandleMessageAsync(IModel channel, BasicDeliverEventArgs eventArgs, CancellationToken cancellationToken)
    {
        var rawBody = Encoding.UTF8.GetString(eventArgs.Body.ToArray());

        try
        {
            var message = JsonSerializer.Deserialize<MessageCreatedEvent>(rawBody, JsonOptions);

            if (message is null)
            {
                logger.LogWarning("RabbitMQ message deserialized to null. deliveryTag={DeliveryTag}", eventArgs.DeliveryTag);
                channel.BasicAck(eventArgs.DeliveryTag, multiple: false);
                return;
            }

            logger.LogInformation(
                "RabbitMQ event received. messageId={MessageId}, receiverId={ReceiverId}, conversationId={ConversationId}",
                message.MessageId,
                message.ReceiverId,
                message.ConversationId);

            await dispatcher.DispatchAsync(message, cancellationToken);

            channel.BasicAck(eventArgs.DeliveryTag, multiple: false);
        }
        catch (JsonException exception)
        {
            logger.LogError(exception, "RabbitMQ message deserialization failed. payload={Payload}", rawBody);
            channel.BasicAck(eventArgs.DeliveryTag, multiple: false);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "RabbitMQ message processing failed. deliveryTag={DeliveryTag}", eventArgs.DeliveryTag);
            channel.BasicNack(eventArgs.DeliveryTag, multiple: false, requeue: true);
        }
    }

    private static Task WaitUntilStoppedAsync(CancellationToken stoppingToken)
    {
        var completionSource = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        stoppingToken.Register(() => completionSource.TrySetResult());
        return completionSource.Task;
    }
}
