namespace realtime_dotnet.Services;

public sealed class PresenceHeartbeatService(
    IUserConnectionStore connectionStore,
    IRedisPresenceService redisPresenceService,
    ILogger<PresenceHeartbeatService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Redis presence heartbeat service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                foreach (var userId in connectionStore.GetConnectedUserIds())
                {
                    await redisPresenceService.RefreshPresenceAsync(userId, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Redis presence heartbeat failed.");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
