using gateway_dotnet.Services;
using Microsoft.AspNetCore.Mvc;

namespace gateway_dotnet.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class HealthController : ControllerBase
{
    private readonly IHealthService _healthService;

    public HealthController(IHealthService healthService)
    {
        _healthService = healthService;
    }

    [HttpGet]
    public IActionResult Get()
    {
        return Ok(_healthService.GetStatus());
    }
}
