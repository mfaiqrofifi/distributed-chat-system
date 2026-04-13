using gateway_dotnet.Models.Auth;

namespace gateway_dotnet.Services;

public interface IAuthService
{
    Task<AuthTokenResponse> HandleGoogleCallbackAsync(
        string? code,
        string? state,
        string? expectedState,
        CancellationToken cancellationToken);
}
