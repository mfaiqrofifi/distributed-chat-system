using Microsoft.AspNetCore.Mvc;
using realtime_dotnet.Models.Gateway;
using realtime_dotnet.Services;

namespace realtime_dotnet.Controllers;

[ApiController]
[Route("api/dev/chat")]
public sealed class DevChatController(
    IGatewayChatProxyClient gatewayChatProxyClient,
    ILogger<DevChatController> logger) : ControllerBase
{
    [HttpPost("me")]
    public async Task<IActionResult> GetCurrentUserAsync([FromBody] GatewayProxyRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await gatewayChatProxyClient.GetCurrentUserAsync(request.JwtToken, cancellationToken);
            return Ok(currentUser);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Dev chat current-user lookup failed.");
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPost("conversation")]
    public async Task<IActionResult> LoadConversationAsync([FromBody] LoadConversationProxyRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var messages = await gatewayChatProxyClient.GetConversationAsync(request.JwtToken, request.ConversationId, cancellationToken);
            return Ok(messages);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Dev chat conversation load failed. conversationId={ConversationId}", request.ConversationId);
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendMessageAsync([FromBody] SendMessageProxyRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var message = await gatewayChatProxyClient.SendMessageAsync(
                request.JwtToken,
                new CreateGatewayMessageRequest
                {
                    ConversationId = request.ConversationId,
                    ReceiverId = request.ReceiverId,
                    Content = request.Content
                },
                cancellationToken);

            return Ok(message);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Dev chat send failed. conversationId={ConversationId}, receiverId={ReceiverId}", request.ConversationId, request.ReceiverId);
            return BadRequest(new { message = exception.Message });
        }
    }
}
