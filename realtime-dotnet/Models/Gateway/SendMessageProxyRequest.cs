using System.ComponentModel.DataAnnotations;

namespace realtime_dotnet.Models.Gateway;

public sealed class SendMessageProxyRequest
{
    [Required]
    public string JwtToken { get; init; } = string.Empty;

    [Required]
    public string ConversationId { get; init; } = string.Empty;

    [Required]
    public string ReceiverId { get; init; } = string.Empty;

    [Required]
    public string Content { get; init; } = string.Empty;
}
