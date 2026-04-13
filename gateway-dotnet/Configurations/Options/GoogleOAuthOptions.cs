namespace gateway_dotnet.Configurations.Options;

public sealed class GoogleOAuthOptions
{
    public const string SectionName = "GoogleOAuth";

    public string ClientId { get; set; } = string.Empty;

    public string ClientSecret { get; set; } = string.Empty;

    public string CallbackUrl { get; set; } = "http://localhost:5001/api/auth/google/callback";

    public string AuthorizationEndpoint { get; set; } = "https://accounts.google.com/o/oauth2/v2/auth";

    public string TokenEndpoint { get; set; } = "https://oauth2.googleapis.com/token";

    public string UserInfoEndpoint { get; set; } = "https://www.googleapis.com/oauth2/v3/userinfo";
}
