using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using realtime_dotnet.Hubs;
using realtime_dotnet.Models.Realtime;
using realtime_dotnet.Services;

namespace realtime_dotnet.Controllers;

[ApiController]
[Route("api/internal/realtime")]
public sealed class InternalRealtimeController(
    IRealtimeMessageDispatcher dispatcher,
    IMessageReadEventPublisher messageReadEventPublisher,
    ILogger<InternalRealtimeController> logger) : ControllerBase
{
    [HttpPost("push")]
    public async Task<IActionResult> PushAsync([FromBody] PushRealtimeMessageRequest request, CancellationToken cancellationToken)
    {
        var message = new MessageCreatedEvent
        {
            MessageId = Guid.NewGuid().ToString("D"),
            ConversationId = request.ConversationId,
            SenderId = request.SenderId,
            ReceiverId = request.UserId,
            Content = request.Content,
            Status = "sent",
            CreatedAt = DateTime.UtcNow
        };

        var result = await dispatcher.DispatchAsync(message, cancellationToken);

        if (!result.Delivered)
        {
            logger.LogWarning("Realtime push skipped because target user has no active connection. userId={UserId}", request.UserId);

            return NotFound(new
            {
                message = "Target user has no active realtime connection."
            });
        }

        logger.LogInformation(
            "Realtime message pushed. targetUserId={UserId}, connectionCount={ConnectionCount}, conversationId={ConversationId}",
            request.UserId,
            result.DeliveredConnectionCount,
            request.ConversationId);

        return Ok(new
        {
            message = "Realtime message sent.",
            deliveredConnectionCount = result.DeliveredConnectionCount,
            payload = new RealtimeMessagePayload
            {
                MessageId = message.MessageId,
                ConversationId = message.ConversationId,
                SenderId = message.SenderId,
                ReceiverId = message.ReceiverId,
                Content = message.Content,
                Status = message.Status,
                Timestamp = message.CreatedAt
            }
        });
    }

    [HttpPost("/api/internal/messages/read")]
    public async Task<IActionResult> MarkReadAsync([FromBody] MarkMessagesReadRequest request, CancellationToken cancellationToken)
    {
        var distinctMessageIds = request.MessageIds
            .Where(messageId => !string.IsNullOrWhiteSpace(messageId))
            .Select(messageId => messageId.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (string.IsNullOrWhiteSpace(request.ConversationId) ||
            string.IsNullOrWhiteSpace(request.UserId) ||
            distinctMessageIds.Length == 0)
        {
            return ValidationProblem(ModelState);
        }

        var readEvent = new MessageReadEvent
        {
            ConversationId = request.ConversationId.Trim(),
            ReaderId = request.UserId.Trim(),
            MessageIds = distinctMessageIds,
            ReadAt = DateTime.UtcNow
        };

        await messageReadEventPublisher.PublishAsync(readEvent, cancellationToken);

        logger.LogInformation(
            "Internal read event accepted. readerId={ReaderId}, conversationId={ConversationId}, messageCount={MessageCount}",
            readEvent.ReaderId,
            readEvent.ConversationId,
            readEvent.MessageIds.Count);

        return Accepted(new
        {
            message = "Read event published.",
            payload = readEvent
        });
    }
}
