using System.ComponentModel.DataAnnotations;

namespace realtime_dotnet.Models.Gateway;

public sealed class GatewayProxyRequest
{
    [Required]
    public string JwtToken { get; init; } = string.Empty;
}
