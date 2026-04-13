using System.ComponentModel.DataAnnotations;

namespace realtime_dotnet.Models.Gateway;

public sealed class LoadConversationProxyRequest
{
    [Required]
    public string JwtToken { get; init; } = string.Empty;

    [Required]
    public string ConversationId { get; init; } = string.Empty;
}
