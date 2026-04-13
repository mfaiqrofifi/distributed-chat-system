using Microsoft.AspNetCore.SignalR;
using realtime_dotnet.Hubs;
using realtime_dotnet.Models.Realtime;

namespace realtime_dotnet.Services;

public sealed class RealtimeMessageDispatcher(
    IUserConnectionStore connectionStore,
    IHubContext<ChatHub> hubContext,
    IMessageDeliveredEventPublisher messageDeliveredEventPublisher,
    ILogger<RealtimeMessageDispatcher> logger) : IRealtimeMessageDispatcher
{
    public async Task<RealtimeDispatchResult> DispatchAsync(MessageCreatedEvent message, CancellationToken cancellationToken)
    {
        var connectionIds = connectionStore.GetConnections(message.ReceiverId);

        if (connectionIds.Count == 0)
        {
            logger.LogInformation(
                "Realtime receiver is offline. receiverId={ReceiverId}, messageId={MessageId}, conversationId={ConversationId}",
                message.ReceiverId,
                message.MessageId,
                message.ConversationId);

            return new RealtimeDispatchResult();
        }

        var payload = new RealtimeMessagePayload
        {
            MessageId = message.MessageId,
            ConversationId = message.ConversationId,
            SenderId = message.SenderId,
            ReceiverId = message.ReceiverId,
            Content = message.Content,
            Status = message.Status,
            Timestamp = message.CreatedAt
        };

        await hubContext.Clients.Clients(connectionIds).SendAsync("message.received", payload, cancellationToken);

        logger.LogInformation(
            "Realtime push delivered. receiverId={ReceiverId}, messageId={MessageId}, connectionCount={ConnectionCount}",
            message.ReceiverId,
            message.MessageId,
            connectionIds.Count);

        var deliveredEventPublished = false;

        try
        {
            await messageDeliveredEventPublisher.PublishAsync(new MessageDeliveredEvent
            {
                MessageId = message.MessageId,
                ConversationId = message.ConversationId,
                SenderId = message.SenderId,
                ReceiverId = message.ReceiverId,
                DeliveredAt = DateTime.UtcNow
            }, cancellationToken);

            deliveredEventPublished = true;
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception,
                "Failed to publish message.delivered event after realtime push. messageId={MessageId}, receiverId={ReceiverId}",
                message.MessageId,
                message.ReceiverId);
        }

        return new RealtimeDispatchResult
        {
            Delivered = true,
            DeliveredConnectionCount = connectionIds.Count,
            DeliveredEventPublished = deliveredEventPublished
        };
    }
}
