namespace realtime_dotnet.Models;

public sealed class HealthResponse
{
    public string Service { get; init; } = "realtime-dotnet";

    public string Status { get; init; } = "ok";

    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}
