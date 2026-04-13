using gateway_dotnet.Entities;
using gateway_dotnet.Models.Auth;

namespace gateway_dotnet.Services;

public sealed class AuthService : IAuthService
{
    private readonly IGoogleOAuthService _googleOAuthService;
    private readonly ITokenService _tokenService;
    private readonly IUserService _userService;

    public AuthService(
        IGoogleOAuthService googleOAuthService,
        ITokenService tokenService,
        IUserService userService)
    {
        _googleOAuthService = googleOAuthService;
        _tokenService = tokenService;
        _userService = userService;
    }

    public async Task<AuthTokenResponse> HandleGoogleCallbackAsync(
        string? code,
        string? state,
        string? expectedState,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new InvalidOperationException("Google did not return an authorization code.");
        }

        if (string.IsNullOrWhiteSpace(state) || string.IsNullOrWhiteSpace(expectedState) || state != expectedState)
        {
            throw new InvalidOperationException("OAuth state validation failed.");
        }

        var googleUser = await _googleOAuthService.ExchangeCodeForUserAsync(code, cancellationToken);
        var user = await _userService.FindOrCreateGoogleUserAsync(googleUser, cancellationToken);
        var token = _tokenService.CreateToken(user);

        return new AuthTokenResponse
        {
            AccessToken = token.AccessToken,
            ExpiresAtUtc = token.ExpiresAtUtc,
            User = MapUser(user)
        };
    }

    private static CurrentUserResponse MapUser(User user)
    {
        return new CurrentUserResponse
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            AvatarUrl = user.AvatarUrl,
            Provider = user.OAuthProvider
        };
    }
}
