namespace gateway_dotnet.Models.Auth;

public sealed class UserListItemResponse
{
    public Guid Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string AvatarUrl { get; set; } = string.Empty;

    public string Provider { get; set; } = string.Empty;
}
