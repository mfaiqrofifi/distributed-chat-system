using gateway_dotnet.Models;

namespace gateway_dotnet.Services;

public interface IHealthService
{
    HealthResponse GetStatus();
}
