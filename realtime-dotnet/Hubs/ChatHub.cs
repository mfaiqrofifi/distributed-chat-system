using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using realtime_dotnet.Services;

namespace realtime_dotnet.Hubs;

[Authorize]
public sealed class ChatHub(
    IUserConnectionStore connectionStore,
    IRedisPresenceService presenceService,
    ILogger<ChatHub> logger) : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = ResolveUserId();

        if (string.IsNullOrWhiteSpace(userId))
        {
            logger.LogWarning("SignalR connection rejected because user id claim is missing. connectionId={ConnectionId}", Context.ConnectionId);
            Context.Abort();
            return;
        }

        connectionStore.AddConnection(userId, Context.ConnectionId);
        await presenceService.UserConnectedAsync(userId, Context.ConnectionId, Context.ConnectionAborted);

        logger.LogInformation(
            "SignalR client connected. userId={UserId}, connectionId={ConnectionId}, connectionCount={ConnectionCount}",
            userId,
            Context.ConnectionId,
            connectionStore.GetConnections(userId).Count);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = ResolveUserId();

        if (!string.IsNullOrWhiteSpace(userId))
        {
            connectionStore.RemoveConnection(userId, Context.ConnectionId);
            await presenceService.UserDisconnectedAsync(userId, Context.ConnectionId, CancellationToken.None);

            logger.LogInformation(
                "SignalR client disconnected. userId={UserId}, connectionId={ConnectionId}, remainingConnections={ConnectionCount}",
                userId,
                Context.ConnectionId,
                connectionStore.GetConnections(userId).Count);
        }

        await base.OnDisconnectedAsync(exception);
    }

    private string? ResolveUserId()
    {
        return Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub");
    }
}
