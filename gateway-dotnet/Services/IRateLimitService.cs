namespace gateway_dotnet.Services;

public interface IRateLimitService
{
    Task<RateLimitDecision> CheckMessageCreateLimitAsync(string userId, CancellationToken cancellationToken);
}
