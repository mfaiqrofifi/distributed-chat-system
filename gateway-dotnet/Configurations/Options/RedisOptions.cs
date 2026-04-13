namespace gateway_dotnet.Configurations.Options;

public sealed class RedisOptions
{
    public const string SectionName = "Redis";

    public string Host { get; set; } = "localhost";

    public int Port { get; set; } = 6379;

    public int MessagesPerMinuteLimit { get; set; } = 20;
}
