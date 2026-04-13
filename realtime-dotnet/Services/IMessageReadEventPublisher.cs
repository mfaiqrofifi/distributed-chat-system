using realtime_dotnet.Models.Realtime;

namespace realtime_dotnet.Services;

public interface IMessageReadEventPublisher
{
    Task PublishAsync(MessageReadEvent messageReadEvent, CancellationToken cancellationToken);
}
