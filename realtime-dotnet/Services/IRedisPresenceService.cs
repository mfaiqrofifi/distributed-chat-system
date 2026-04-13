using realtime_dotnet.Models.Presence;

namespace realtime_dotnet.Services;

public interface IRedisPresenceService
{
    Task UserConnectedAsync(string userId, string connectionId, CancellationToken cancellationToken);

    Task UserDisconnectedAsync(string userId, string connectionId, CancellationToken cancellationToken);

    Task RefreshPresenceAsync(string userId, CancellationToken cancellationToken);

    Task<PresenceResponse> GetPresenceAsync(string userId, CancellationToken cancellationToken);
}
