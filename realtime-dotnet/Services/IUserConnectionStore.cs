namespace realtime_dotnet.Services;

public interface IUserConnectionStore
{
    void AddConnection(string userId, string connectionId);

    void RemoveConnection(string userId, string connectionId);

    IReadOnlyCollection<string> GetConnections(string userId);

    IReadOnlyCollection<string> GetConnectedUserIds();
}
