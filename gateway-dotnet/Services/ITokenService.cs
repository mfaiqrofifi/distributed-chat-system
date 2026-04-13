using gateway_dotnet.Entities;
using gateway_dotnet.Models.Auth;

namespace gateway_dotnet.Services;

public interface ITokenService
{
    TokenResult CreateToken(User user);
}
