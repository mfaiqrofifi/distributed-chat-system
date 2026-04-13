namespace realtime_dotnet.Models.Gateway;

public sealed class CurrentUserResponse
{
    public string Id { get; init; } = string.Empty;

    public string Email { get; init; } = string.Empty;

    public string Name { get; init; } = string.Empty;

    public string AvatarUrl { get; init; } = string.Empty;

    public string Provider { get; init; } = string.Empty;
}
