using gateway_dotnet.Models.Chat;

namespace gateway_dotnet.Services;

public sealed class ChatGatewayService : IChatGatewayService
{
    private readonly IChatServiceClient _chatServiceClient;

    public ChatGatewayService(IChatServiceClient chatServiceClient)
    {
        _chatServiceClient = chatServiceClient;
    }

    public async Task<ChatMessageResponse> CreateMessageAsync(
        string senderId,
        CreateGatewayMessageRequest request,
        CancellationToken cancellationToken)
    {
        var javaRequest = new CreateJavaMessageRequest
        {
            ConversationId = request.ConversationId,
            SenderId = senderId,
            ReceiverId = request.ReceiverId,
            Content = request.Content
        };

        return await _chatServiceClient.CreateMessageAsync(javaRequest, cancellationToken);
    }

    public async Task<IReadOnlyList<ChatMessageResponse>> GetConversationMessagesAsync(
        string conversationId,
        CancellationToken cancellationToken)
    {
        return await _chatServiceClient.GetConversationMessagesAsync(conversationId, cancellationToken);
    }
}
