using gateway_dotnet.Models.Auth;

namespace gateway_dotnet.Services;

public interface IGoogleOAuthService
{
    string BuildAuthorizationUrl(string state);

    Task<GoogleUserInfoResponse> ExchangeCodeForUserAsync(string code, CancellationToken cancellationToken);
}
