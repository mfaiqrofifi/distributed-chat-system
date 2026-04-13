using System.Text.Json.Serialization;

namespace gateway_dotnet.Models.Auth;

public sealed class GoogleUserInfoResponse
{
    [JsonPropertyName("sub")]
    public string Subject { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("picture")]
    public string Picture { get; set; } = string.Empty;
}
