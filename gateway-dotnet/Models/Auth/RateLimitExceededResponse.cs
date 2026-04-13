namespace gateway_dotnet.Models.Auth;

public sealed class RateLimitExceededResponse
{
    public string Message { get; set; } = "Rate limit exceeded.";

    public int RetryAfterSeconds { get; set; }

    public int Limit { get; set; }

    public int WindowSeconds { get; set; } = 60;
}
