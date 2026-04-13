using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using gateway_dotnet.Models.Auth;
using gateway_dotnet.Models.Chat;
using gateway_dotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace gateway_dotnet.Controllers;

[ApiController]
[Authorize]
[Route("api/messages")]
public sealed class MessagesController : ControllerBase
{
    private readonly IChatGatewayService _chatGatewayService;
    private readonly IRateLimitService _rateLimitService;

    public MessagesController(IChatGatewayService chatGatewayService, IRateLimitService rateLimitService)
    {
        _chatGatewayService = chatGatewayService;
        _rateLimitService = rateLimitService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateMessage(
        [FromBody] CreateGatewayMessageRequest request,
        CancellationToken cancellationToken)
    {
        var senderId = ResolveSenderId();

        if (string.IsNullOrWhiteSpace(senderId))
        {
            return Unauthorized(new ErrorResponse
            {
                Message = "Authenticated user id could not be resolved from JWT claims."
            });
        }

        var rateLimitDecision = await _rateLimitService.CheckMessageCreateLimitAsync(senderId, cancellationToken);

        if (!rateLimitDecision.IsAllowed)
        {
            Response.Headers.RetryAfter = rateLimitDecision.RetryAfterSeconds.ToString();

            return StatusCode(StatusCodes.Status429TooManyRequests, new RateLimitExceededResponse
            {
                Message = "Message rate limit exceeded. Try again in a few seconds.",
                RetryAfterSeconds = rateLimitDecision.RetryAfterSeconds,
                Limit = rateLimitDecision.Limit
            });
        }

        var message = await _chatGatewayService.CreateMessageAsync(senderId, request, cancellationToken);

        return StatusCode(StatusCodes.Status201Created, message);
    }

    [HttpGet("conversation/{conversationId}")]
    public async Task<IActionResult> GetConversationMessages(
        [FromRoute] string conversationId,
        CancellationToken cancellationToken)
    {
        var senderId = ResolveSenderId();

        if (string.IsNullOrWhiteSpace(senderId))
        {
            return Unauthorized(new ErrorResponse
            {
                Message = "Authenticated user id could not be resolved from JWT claims."
            });
        }

        var messages = await _chatGatewayService.GetConversationMessagesAsync(conversationId, cancellationToken);

        return Ok(messages);
    }

    private string? ResolveSenderId()
    {
        return User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
    }
}
