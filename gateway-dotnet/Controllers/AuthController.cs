using System.Security.Cryptography;
using gateway_dotnet.Models.Auth;
using gateway_dotnet.Services;
using Microsoft.AspNetCore.Mvc;

namespace gateway_dotnet.Controllers;

[ApiController]
[Route("api/auth/google")]
public sealed class AuthController : ControllerBase
{
    private const string OAuthStateCookieName = "gateway_google_oauth_state";
    private const string OAuthReturnUrlCookieName = "gateway_google_oauth_return_url";

    private readonly IAuthService _authService;
    private readonly IGoogleOAuthService _googleOAuthService;

    public AuthController(IAuthService authService, IGoogleOAuthService googleOAuthService)
    {
        _authService = authService;
        _googleOAuthService = googleOAuthService;
    }

    [HttpGet("login")]
    public IActionResult Login([FromQuery] string? returnUrl)
    {
        var state = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

        Response.Cookies.Append(OAuthStateCookieName, state, new CookieOptions
        {
            HttpOnly = true,
            IsEssential = true,
            SameSite = SameSiteMode.Lax,
            Secure = Request.IsHttps,
            Expires = DateTimeOffset.UtcNow.AddMinutes(5)
        });

        if (TryGetSafeReturnUrl(returnUrl, out var safeReturnUrl))
        {
            Response.Cookies.Append(OAuthReturnUrlCookieName, safeReturnUrl, new CookieOptions
            {
                HttpOnly = true,
                IsEssential = true,
                SameSite = SameSiteMode.Lax,
                Secure = Request.IsHttps,
                Expires = DateTimeOffset.UtcNow.AddMinutes(5)
            });
        }
        else
        {
            Response.Cookies.Delete(OAuthReturnUrlCookieName);
        }

        var redirectUrl = _googleOAuthService.BuildAuthorizationUrl(state);

        return Redirect(redirectUrl);
    }

    [HttpGet("callback")]
    public async Task<IActionResult> Callback(
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? error,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(error))
        {
            return BadRequest(new ErrorResponse
            {
                Message = $"Google OAuth failed: {error}"
            });
        }

        var expectedState = Request.Cookies[OAuthStateCookieName];
        var returnUrl = Request.Cookies[OAuthReturnUrlCookieName];
        Response.Cookies.Delete(OAuthStateCookieName);
        Response.Cookies.Delete(OAuthReturnUrlCookieName);

        try
        {
            var result = await _authService.HandleGoogleCallbackAsync(
                code,
                state,
                expectedState,
                cancellationToken);

            if (TryGetSafeReturnUrl(returnUrl, out var safeReturnUrl))
            {
                var redirectUrl = BuildFrontendRedirectUrl(safeReturnUrl, result);
                return Redirect(redirectUrl);
            }

            return Ok(result);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new ErrorResponse
            {
                Message = exception.Message
            });
        }
    }

    private static bool TryGetSafeReturnUrl(string? returnUrl, out string safeReturnUrl)
    {
        safeReturnUrl = string.Empty;

        if (string.IsNullOrWhiteSpace(returnUrl))
        {
            return false;
        }

        if (!Uri.TryCreate(returnUrl, UriKind.Absolute, out var parsedUri))
        {
            return false;
        }

        if (parsedUri.Scheme is not ("http" or "https"))
        {
            return false;
        }

        if (parsedUri.Host is not ("localhost" or "127.0.0.1"))
        {
            return false;
        }

        safeReturnUrl = parsedUri.GetLeftPart(UriPartial.Path);

        return true;
    }

    private static string BuildFrontendRedirectUrl(string safeReturnUrl, AuthTokenResponse result)
    {
        var parameters = new Dictionary<string, string?>
        {
            ["accessToken"] = result.AccessToken,
            ["expiresAtUtc"] = result.ExpiresAtUtc.ToString("O"),
            ["userId"] = result.User.Id.ToString(),
            ["email"] = result.User.Email,
            ["name"] = result.User.Name
        };

        var fragment = string.Join(
            "&",
            parameters.Select(pair => $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value ?? string.Empty)}"));

        return $"{safeReturnUrl}#oauth=success&{fragment}";
    }
}
