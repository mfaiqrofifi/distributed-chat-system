namespace realtime_dotnet.Models.Realtime;

public sealed class MessageDeliveredEvent
{
    public string MessageId { get; init; } = string.Empty;

    public string ConversationId { get; init; } = string.Empty;

    public string SenderId { get; init; } = string.Empty;

    public string ReceiverId { get; init; } = string.Empty;

    public DateTime DeliveredAt { get; init; } = DateTime.UtcNow;
}
