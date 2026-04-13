using System.ComponentModel.DataAnnotations;

namespace realtime_dotnet.Models.Realtime;

public sealed class PushRealtimeMessageRequest
{
    [Required]
    public string UserId { get; init; } = string.Empty;

    [Required]
    public string ConversationId { get; init; } = string.Empty;

    [Required]
    public string SenderId { get; init; } = string.Empty;

    [Required]
    public string Content { get; init; } = string.Empty;
}
