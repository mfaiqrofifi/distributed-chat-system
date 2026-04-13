using Microsoft.AspNetCore.Mvc;
using realtime_dotnet.Models;

namespace realtime_dotnet.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public ActionResult<HealthResponse> Get()
    {
        return Ok(new HealthResponse());
    }
}
