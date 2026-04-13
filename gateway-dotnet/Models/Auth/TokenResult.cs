namespace gateway_dotnet.Models.Auth;

public sealed class TokenResult
{
    public string AccessToken { get; set; } = string.Empty;

    public DateTime ExpiresAtUtc { get; set; }
}
