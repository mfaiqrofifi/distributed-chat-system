namespace realtime_dotnet.Models.Realtime;

public sealed class RealtimeMessagePayload
{
    public string MessageId { get; init; } = string.Empty;

    public string ConversationId { get; init; } = string.Empty;

    public string SenderId { get; init; } = string.Empty;

    public string ReceiverId { get; init; } = string.Empty;

    public string Content { get; init; } = string.Empty;

    public string Status { get; init; } = string.Empty;

    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}
