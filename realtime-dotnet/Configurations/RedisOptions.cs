namespace realtime_dotnet.Configurations;

public sealed class RedisOptions
{
    public const string SectionName = "Redis";

    public string Host { get; set; } = "localhost";

    public int Port { get; set; } = 6379;

    public string PresenceKeyPrefix { get; set; } = "presence";

    public int PresenceTtlSeconds { get; set; } = 120;
}
