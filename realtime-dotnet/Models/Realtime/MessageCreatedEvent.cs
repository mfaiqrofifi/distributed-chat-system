using System.Text.Json.Serialization;
using realtime_dotnet.Configurations;

namespace realtime_dotnet.Models.Realtime;

public sealed class MessageCreatedEvent
{
    public string MessageId { get; init; } = string.Empty;

    public string ConversationId { get; init; } = string.Empty;

    public string SenderId { get; init; } = string.Empty;

    public string ReceiverId { get; init; } = string.Empty;

    public string Content { get; init; } = string.Empty;

    public string Status { get; init; } = string.Empty;

    [JsonConverter(typeof(UnixSecondsDateTimeConverter))]
    public DateTime CreatedAt { get; init; }
}
