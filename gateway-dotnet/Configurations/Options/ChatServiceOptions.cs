namespace gateway_dotnet.Configurations.Options;

public sealed class ChatServiceOptions
{
    public const string SectionName = "ChatService";

    public string BaseUrl { get; set; } = "http://localhost:8080";
}
