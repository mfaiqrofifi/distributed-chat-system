namespace gateway_dotnet.Models.Chat;

public sealed class CreateJavaMessageRequest
{
    public string ConversationId { get; set; } = string.Empty;

    public string SenderId { get; set; } = string.Empty;

    public string ReceiverId { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;
}
