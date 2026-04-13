using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using realtime_dotnet.Models.Gateway;

namespace realtime_dotnet.Services;

public sealed class GatewayChatProxyClient(HttpClient httpClient) : IGatewayChatProxyClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<CurrentUserResponse> GetCurrentUserAsync(string jwtToken, CancellationToken cancellationToken)
    {
        using var request = CreateAuthorizedRequest(HttpMethod.Get, "/api/me", jwtToken);
        using var response = await httpClient.SendAsync(request, cancellationToken);
        return await ReadAsJsonAsync<CurrentUserResponse>(response, cancellationToken);
    }

    public async Task<IReadOnlyList<ChatMessageResponse>> GetConversationAsync(string jwtToken, string conversationId, CancellationToken cancellationToken)
    {
        using var request = CreateAuthorizedRequest(HttpMethod.Get, $"/api/messages/conversation/{Uri.EscapeDataString(conversationId)}", jwtToken);
        using var response = await httpClient.SendAsync(request, cancellationToken);
        return await ReadAsJsonAsync<List<ChatMessageResponse>>(response, cancellationToken);
    }

    public async Task<ChatMessageResponse> SendMessageAsync(string jwtToken, CreateGatewayMessageRequest requestModel, CancellationToken cancellationToken)
    {
        using var request = CreateAuthorizedRequest(HttpMethod.Post, "/api/messages", jwtToken);
        request.Content = JsonContent.Create(requestModel);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        return await ReadAsJsonAsync<ChatMessageResponse>(response, cancellationToken);
    }

    private static HttpRequestMessage CreateAuthorizedRequest(HttpMethod method, string requestUri, string jwtToken)
    {
        var request = new HttpRequestMessage(method, requestUri);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", jwtToken);
        return request;
    }

    private static async Task<T> ReadAsJsonAsync<T>(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Gateway call failed with {(int)response.StatusCode}: {body}");
        }

        var result = JsonSerializer.Deserialize<T>(body, JsonOptions);

        if (result is null)
        {
            throw new InvalidOperationException("Gateway returned an empty or invalid JSON payload.");
        }

        return result;
    }
}
