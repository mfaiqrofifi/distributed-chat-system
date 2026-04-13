using gateway_dotnet.Models.Chat;

namespace gateway_dotnet.Services;

public interface IChatGatewayService
{
    Task<ChatMessageResponse> CreateMessageAsync(
        string senderId,
        CreateGatewayMessageRequest request,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<ChatMessageResponse>> GetConversationMessagesAsync(
        string conversationId,
        CancellationToken cancellationToken);
}
