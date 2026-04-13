namespace gateway_dotnet.Entities;

public sealed class User
{
    public Guid Id { get; set; }

    public string OAuthProvider { get; set; } = string.Empty;

    public string OAuthSubject { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string AvatarUrl { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}
