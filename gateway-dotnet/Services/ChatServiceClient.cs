using System.Net.Http.Json;
using gateway_dotnet.Models.Chat;

namespace gateway_dotnet.Services;

public sealed class ChatServiceClient : IChatServiceClient
{
    private readonly HttpClient _httpClient;

    public ChatServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<ChatMessageResponse> CreateMessageAsync(
        CreateJavaMessageRequest request,
        CancellationToken cancellationToken)
    {
        using var response = await _httpClient.PostAsJsonAsync("/api/messages", request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);

        var message = await response.Content.ReadFromJsonAsync<ChatMessageResponse>(cancellationToken: cancellationToken);

        return message ?? throw new InvalidOperationException("Java chat service returned an empty create-message response.");
    }

    public async Task<IReadOnlyList<ChatMessageResponse>> GetConversationMessagesAsync(
        string conversationId,
        CancellationToken cancellationToken)
    {
        using var response = await _httpClient.GetAsync($"/api/messages/conversation/{conversationId}", cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);

        var messages = await response.Content.ReadFromJsonAsync<List<ChatMessageResponse>>(cancellationToken: cancellationToken);

        return messages ?? [];
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
        throw new HttpRequestException(
            $"Java chat service request failed with status {(int)response.StatusCode}: {errorContent}");
    }
}
