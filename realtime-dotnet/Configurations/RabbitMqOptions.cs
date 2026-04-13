namespace realtime_dotnet.Configurations;

public sealed class RabbitMqOptions
{
    public const string SectionName = "RabbitMq";

    public string Exchange { get; set; } = "chat.exchange";

    public string RoutingKey { get; set; } = "message.created";

    public string Host { get; set; } = "localhost";

    public int Port { get; set; } = 5672;

    public string Username { get; set; } = "guest";

    public string Password { get; set; } = "guest";

    public string QueueName { get; set; } = "chat.message.created.queue";

    public string DeliveredQueueName { get; set; } = "chat.message.delivered.queue";

    public string DeliveredRoutingKey { get; set; } = "message.delivered";

    public string ReadQueueName { get; set; } = "chat.message.read.queue";

    public string ReadRoutingKey { get; set; } = "message.read";
}
