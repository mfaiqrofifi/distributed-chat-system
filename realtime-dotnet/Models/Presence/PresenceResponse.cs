namespace realtime_dotnet.Models.Presence;

public sealed class PresenceResponse
{
    public string UserId { get; set; } = string.Empty;

    public bool IsOnline { get; set; }

    public DateTime? LastSeenAt { get; set; }
}
