using gateway_dotnet.Models.Chat;

namespace gateway_dotnet.Services;

public interface IChatServiceClient
{
    Task<ChatMessageResponse> CreateMessageAsync(CreateJavaMessageRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<ChatMessageResponse>> GetConversationMessagesAsync(string conversationId, CancellationToken cancellationToken);
}
