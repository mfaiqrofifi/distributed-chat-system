using System.Collections.Concurrent;

namespace realtime_dotnet.Services;

public sealed class InMemoryUserConnectionStore : IUserConnectionStore
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte>> _connections = new();

    public void AddConnection(string userId, string connectionId)
    {
        var userConnections = _connections.GetOrAdd(userId, _ => new ConcurrentDictionary<string, byte>());
        userConnections[connectionId] = 0;
    }

    public void RemoveConnection(string userId, string connectionId)
    {
        if (!_connections.TryGetValue(userId, out var userConnections))
        {
            return;
        }

        userConnections.TryRemove(connectionId, out _);

        if (userConnections.IsEmpty)
        {
            _connections.TryRemove(userId, out _);
        }
    }

    public IReadOnlyCollection<string> GetConnections(string userId)
    {
        if (!_connections.TryGetValue(userId, out var userConnections))
        {
            return Array.Empty<string>();
        }

        return userConnections.Keys.ToArray();
    }

    public IReadOnlyCollection<string> GetConnectedUserIds()
    {
        return _connections.Keys.ToArray();
    }
}
