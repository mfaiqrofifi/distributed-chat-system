namespace realtime_dotnet.Models.Realtime;

public sealed class MessageReadEvent
{
    public string ConversationId { get; init; } = string.Empty;

    public string ReaderId { get; init; } = string.Empty;

    public IReadOnlyCollection<string> MessageIds { get; init; } = Array.Empty<string>();

    public DateTime ReadAt { get; init; }
}
