namespace gateway_dotnet.Models.Auth;

public sealed class AuthTokenResponse
{
    public string AccessToken { get; set; } = string.Empty;

    public DateTime ExpiresAtUtc { get; set; }

    public CurrentUserResponse User { get; set; } = new();
}
