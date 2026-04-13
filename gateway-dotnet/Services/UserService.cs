using gateway_dotnet.Entities;
using gateway_dotnet.Models.Auth;
using gateway_dotnet.Repositories;

namespace gateway_dotnet.Services;

public sealed class UserService : IUserService
{
    private const string GoogleProvider = "google";

    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _userRepository.GetByIdAsync(id, cancellationToken);
    }

    public async Task<IReadOnlyList<User>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _userRepository.GetAllAsync(cancellationToken);
    }

    public async Task<User> FindOrCreateGoogleUserAsync(
        GoogleUserInfoResponse googleUser,
        CancellationToken cancellationToken)
    {
        var existingUser = await _userRepository.GetByProviderSubjectAsync(
            GoogleProvider,
            googleUser.Subject,
            cancellationToken);

        if (existingUser is not null)
        {
            return existingUser;
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            OAuthProvider = GoogleProvider,
            OAuthSubject = googleUser.Subject,
            Email = googleUser.Email,
            Name = googleUser.Name,
            AvatarUrl = googleUser.Picture,
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(user, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return user;
    }
}
