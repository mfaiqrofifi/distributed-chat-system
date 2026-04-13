using gateway_dotnet.Entities;
using gateway_dotnet.Models.Auth;

namespace gateway_dotnet.Services;

public interface IUserService
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<User>> GetAllAsync(CancellationToken cancellationToken);

    Task<User> FindOrCreateGoogleUserAsync(GoogleUserInfoResponse googleUser, CancellationToken cancellationToken);
}
