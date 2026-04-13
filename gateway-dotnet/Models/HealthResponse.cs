namespace gateway_dotnet.Models;

public sealed class HealthResponse
{
    public string Service { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; }
}
