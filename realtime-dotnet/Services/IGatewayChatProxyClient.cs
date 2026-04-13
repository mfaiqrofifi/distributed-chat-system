using realtime_dotnet.Models.Gateway;

namespace realtime_dotnet.Services;

public interface IGatewayChatProxyClient
{
    Task<CurrentUserResponse> GetCurrentUserAsync(string jwtToken, CancellationToken cancellationToken);

    Task<IReadOnlyList<ChatMessageResponse>> GetConversationAsync(string jwtToken, string conversationId, CancellationToken cancellationToken);

    Task<ChatMessageResponse> SendMessageAsync(string jwtToken, CreateGatewayMessageRequest request, CancellationToken cancellationToken);
}
