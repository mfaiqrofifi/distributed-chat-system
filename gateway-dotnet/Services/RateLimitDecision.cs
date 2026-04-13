namespace gateway_dotnet.Services;

public sealed class RateLimitDecision
{
    public bool IsAllowed { get; init; }

    public int RetryAfterSeconds { get; init; }

    public int Limit { get; init; }
}
