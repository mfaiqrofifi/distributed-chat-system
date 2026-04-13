namespace realtime_dotnet.Models.Gateway;

public sealed class ChatMessageResponse
{
    public string Id { get; init; } = string.Empty;

    public string ConversationId { get; init; } = string.Empty;

    public string SenderId { get; init; } = string.Empty;

    public string ReceiverId { get; init; } = string.Empty;

    public string Content { get; init; } = string.Empty;

    public string Status { get; init; } = string.Empty;

    public DateTime CreatedAt { get; init; }
}
