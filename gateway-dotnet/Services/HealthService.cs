using gateway_dotnet.Models;

namespace gateway_dotnet.Services;

public sealed class HealthService : IHealthService
{
    public HealthResponse GetStatus()
    {
        return new HealthResponse
        {
            Service = "gateway-dotnet",
            Status = "ok",
            Timestamp = DateTime.UtcNow
        };
    }
}
