using gateway_dotnet.Configurations.Options;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace gateway_dotnet.Services;

public sealed class RedisRateLimitService(
    IConnectionMultiplexer connectionMultiplexer,
    IOptions<RedisOptions> options,
    ILogger<RedisRateLimitService> logger) : IRateLimitService
{
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    private readonly RedisOptions _options = options.Value;

    public async Task<RateLimitDecision> CheckMessageCreateLimitAsync(string userId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var now = DateTime.UtcNow;
        var windowKey = $"ratelimit:messages:{userId}:{now:yyyyMMddHHmm}";
        var retryAfterSeconds = Math.Max(1, 60 - now.Second);

        var requestCount = await _database.StringIncrementAsync(windowKey);

        if (requestCount == 1)
        {
            await _database.KeyExpireAsync(windowKey, TimeSpan.FromSeconds(retryAfterSeconds + 5));
        }

        var isAllowed = requestCount <= _options.MessagesPerMinuteLimit;

        if (!isAllowed)
        {
            logger.LogWarning(
                "Message create rate limit exceeded. userId={UserId}, requestCount={RequestCount}, limit={Limit}, redisKey={RedisKey}",
                userId,
                requestCount,
                _options.MessagesPerMinuteLimit,
                windowKey);
        }

        return new RateLimitDecision
        {
            IsAllowed = isAllowed,
            RetryAfterSeconds = retryAfterSeconds,
            Limit = _options.MessagesPerMinuteLimit
        };
    }
}
