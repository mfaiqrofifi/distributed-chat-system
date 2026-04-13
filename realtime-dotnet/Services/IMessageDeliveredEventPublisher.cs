using realtime_dotnet.Models.Realtime;

namespace realtime_dotnet.Services;

public interface IMessageDeliveredEventPublisher
{
    Task PublishAsync(MessageDeliveredEvent messageDeliveredEvent, CancellationToken cancellationToken);
}
