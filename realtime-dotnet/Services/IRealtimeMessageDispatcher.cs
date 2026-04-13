using realtime_dotnet.Models.Realtime;

namespace realtime_dotnet.Services;

public interface IRealtimeMessageDispatcher
{
    Task<RealtimeDispatchResult> DispatchAsync(MessageCreatedEvent message, CancellationToken cancellationToken);
}
