using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using gateway_dotnet.Models.Auth;
using gateway_dotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace gateway_dotnet.Controllers;

[ApiController]
[Route("api")]
public sealed class AccountController : ControllerBase
{
    private readonly IUserService _userService;

    public AccountController(IUserService userService)
    {
        _userService = userService;
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(new ErrorResponse
            {
                Message = "The JWT subject is invalid."
            });
        }

        var user = await _userService.GetByIdAsync(userId, cancellationToken);

        if (user is null)
        {
            return NotFound(new ErrorResponse
            {
                Message = "User not found."
            });
        }

        return Ok(new CurrentUserResponse
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            AvatarUrl = user.AvatarUrl,
            Provider = user.OAuthProvider
        });
    }

    [Authorize]
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        Guid.TryParse(currentUserId, out var parsedCurrentUserId);

        var users = await _userService.GetAllAsync(cancellationToken);

        var response = users
            .Where(user => user.Id != parsedCurrentUserId)
            .Select(user => new UserListItemResponse
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                AvatarUrl = user.AvatarUrl,
                Provider = user.OAuthProvider
            })
            .ToList();

        return Ok(response);
    }
}
