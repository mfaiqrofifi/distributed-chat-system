using Microsoft.Extensions.Options;
using realtime_dotnet.Configurations;
using realtime_dotnet.Models.Presence;
using StackExchange.Redis;

namespace realtime_dotnet.Services;

public sealed class RedisPresenceService(
    IConnectionMultiplexer connectionMultiplexer,
    IOptions<RedisOptions> options,
    ILogger<RedisPresenceService> logger) : IRedisPresenceService
{
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    private readonly RedisOptions _options = options.Value;

    public async Task UserConnectedAsync(string userId, string connectionId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var onlineConnectionsKey = GetConnectionsKey(userId);

        await _database.SetAddAsync(onlineConnectionsKey, connectionId);
        await _database.KeyExpireAsync(onlineConnectionsKey, TimeSpan.FromSeconds(_options.PresenceTtlSeconds));
        await _database.KeyDeleteAsync(GetLastSeenKey(userId));

        logger.LogInformation(
            "Redis presence marked online. userId={UserId}, connectionId={ConnectionId}, key={PresenceKey}",
            userId,
            connectionId,
            onlineConnectionsKey);
    }

    public async Task UserDisconnectedAsync(string userId, string connectionId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var onlineConnectionsKey = GetConnectionsKey(userId);

        await _database.SetRemoveAsync(onlineConnectionsKey, connectionId);

        var remainingConnections = await _database.SetLengthAsync(onlineConnectionsKey);

        if (remainingConnections > 0)
        {
            await _database.KeyExpireAsync(onlineConnectionsKey, TimeSpan.FromSeconds(_options.PresenceTtlSeconds));

            logger.LogInformation(
                "Redis presence connection removed. userId={UserId}, connectionId={ConnectionId}, remainingConnections={ConnectionCount}",
                userId,
                connectionId,
                remainingConnections);

            return;
        }

        await _database.KeyDeleteAsync(onlineConnectionsKey);
        await _database.StringSetAsync(GetLastSeenKey(userId), DateTime.UtcNow.ToString("O"));

        logger.LogInformation(
            "Redis presence marked offline. userId={UserId}, connectionId={ConnectionId}",
            userId,
            connectionId);
    }

    public async Task RefreshPresenceAsync(string userId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var onlineConnectionsKey = GetConnectionsKey(userId);

        if (!await _database.KeyExistsAsync(onlineConnectionsKey))
        {
            return;
        }

        await _database.KeyExpireAsync(onlineConnectionsKey, TimeSpan.FromSeconds(_options.PresenceTtlSeconds));
    }

    public async Task<PresenceResponse> GetPresenceAsync(string userId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var onlineConnectionsKey = GetConnectionsKey(userId);
        var hasConnectionSet = await _database.KeyExistsAsync(onlineConnectionsKey);
        var isOnline = hasConnectionSet && await _database.SetLengthAsync(onlineConnectionsKey) > 0;
        var lastSeenValue = await _database.StringGetAsync(GetLastSeenKey(userId));

        DateTime? lastSeenAt = null;

        if (lastSeenValue.HasValue
            && DateTime.TryParse(lastSeenValue!, null, System.Globalization.DateTimeStyles.RoundtripKind, out var parsedLastSeen))
        {
            lastSeenAt = parsedLastSeen.ToUniversalTime();
        }

        if (isOnline)
        {
            lastSeenAt = null;
        }

        return new PresenceResponse
        {
            UserId = userId,
            IsOnline = isOnline,
            LastSeenAt = lastSeenAt
        };
    }

    private string GetConnectionsKey(string userId)
    {
        return $"{_options.PresenceKeyPrefix}:user:{userId}:connections";
    }

    private string GetLastSeenKey(string userId)
    {
        return $"{_options.PresenceKeyPrefix}:user:{userId}:last_seen";
    }
}
