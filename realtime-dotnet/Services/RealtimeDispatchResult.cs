namespace realtime_dotnet.Services;

public sealed class RealtimeDispatchResult
{
    public bool Delivered { get; init; }

    public int DeliveredConnectionCount { get; init; }

    public bool DeliveredEventPublished { get; init; }
}
