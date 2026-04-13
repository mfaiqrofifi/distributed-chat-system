using System.ComponentModel.DataAnnotations;

namespace realtime_dotnet.Models.Realtime;

public sealed class MarkMessagesReadRequest
{
    [Required]
    public string ConversationId { get; init; } = string.Empty;

    [Required]
    public string UserId { get; init; } = string.Empty;

    [Required]
    [MinLength(1)]
    public IReadOnlyCollection<string> MessageIds { get; init; } = Array.Empty<string>();
}
