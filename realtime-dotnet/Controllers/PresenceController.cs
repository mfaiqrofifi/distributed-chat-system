using Microsoft.AspNetCore.Mvc;
using realtime_dotnet.Services;

namespace realtime_dotnet.Controllers;

[ApiController]
[Route("api/presence")]
public sealed class PresenceController(IRedisPresenceService presenceService) : ControllerBase
{
    [HttpGet("{userId}")]
    public async Task<IActionResult> GetAsync([FromRoute] string userId, CancellationToken cancellationToken)
    {
        var presence = await presenceService.GetPresenceAsync(userId, cancellationToken);
        return Ok(presence);
    }
}
