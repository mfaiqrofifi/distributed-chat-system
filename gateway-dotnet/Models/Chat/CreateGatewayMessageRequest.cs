using System.ComponentModel.DataAnnotations;

namespace gateway_dotnet.Models.Chat;

public sealed class CreateGatewayMessageRequest
{
    [Required]
    public string ConversationId { get; set; } = string.Empty;

    [Required]
    public string ReceiverId { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;
}
