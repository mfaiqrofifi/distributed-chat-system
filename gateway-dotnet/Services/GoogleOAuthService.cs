using System.Net.Http.Headers;
using System.Net.Http.Json;
using gateway_dotnet.Configurations.Options;
using gateway_dotnet.Models.Auth;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;

namespace gateway_dotnet.Services;

public sealed class GoogleOAuthService : IGoogleOAuthService
{
    private static readonly string[] Scopes = ["openid", "email", "profile"];

    private readonly HttpClient _httpClient;
    private readonly GoogleOAuthOptions _options;

    public GoogleOAuthService(HttpClient httpClient, IOptions<GoogleOAuthOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public string BuildAuthorizationUrl(string state)
    {
        var parameters = new Dictionary<string, string?>
        {
            ["client_id"] = _options.ClientId,
            ["redirect_uri"] = _options.CallbackUrl,
            ["response_type"] = "code",
            ["scope"] = string.Join(' ', Scopes),
            ["access_type"] = "online",
            ["include_granted_scopes"] = "true",
            ["state"] = state
        };

        return QueryHelpers.AddQueryString(_options.AuthorizationEndpoint, parameters);
    }

    public async Task<GoogleUserInfoResponse> ExchangeCodeForUserAsync(string code, CancellationToken cancellationToken)
    {
        var tokenResponse = await RequestAccessTokenAsync(code, cancellationToken);

        using var request = new HttpRequestMessage(HttpMethod.Get, _options.UserInfoEndpoint);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResponse.AccessToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException("Failed to retrieve Google user profile.");
        }

        var googleUser = await response.Content.ReadFromJsonAsync<GoogleUserInfoResponse>(cancellationToken: cancellationToken);

        if (googleUser is null || string.IsNullOrWhiteSpace(googleUser.Subject))
        {
            throw new InvalidOperationException("Google user profile response was invalid.");
        }

        return googleUser;
    }

    private async Task<GoogleTokenResponse> RequestAccessTokenAsync(string code, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, _options.TokenEndpoint)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = _options.ClientId,
                ["client_secret"] = _options.ClientSecret,
                ["redirect_uri"] = _options.CallbackUrl,
                ["grant_type"] = "authorization_code"
            })
        };

        using var response = await _httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException("Failed to exchange Google authorization code.");
        }

        var tokenResponse = await response.Content.ReadFromJsonAsync<GoogleTokenResponse>(cancellationToken: cancellationToken);

        if (tokenResponse is null || string.IsNullOrWhiteSpace(tokenResponse.AccessToken))
        {
            throw new InvalidOperationException("Google token response was invalid.");
        }

        return tokenResponse;
    }
}
