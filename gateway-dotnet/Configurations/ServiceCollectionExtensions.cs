using gateway_dotnet.Configurations.Options;
using gateway_dotnet.Repositories;
using gateway_dotnet.Services;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace gateway_dotnet.Configurations;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<ChatServiceOptions>(configuration.GetSection(ChatServiceOptions.SectionName));
        services.Configure<GoogleOAuthOptions>(configuration.GetSection(GoogleOAuthOptions.SectionName));
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<RedisOptions>(configuration.GetSection(RedisOptions.SectionName));

        services.AddHttpClient<IChatServiceClient, ChatServiceClient>((serviceProvider, client) =>
        {
            var options = serviceProvider
                .GetRequiredService<IOptions<ChatServiceOptions>>()
                .Value;

            client.BaseAddress = new Uri(options.BaseUrl);
        });
        services.AddHttpClient<IGoogleOAuthService, GoogleOAuthService>();
        services.AddSingleton<IConnectionMultiplexer>(serviceProvider =>
        {
            var options = serviceProvider
                .GetRequiredService<IOptions<RedisOptions>>()
                .Value;

            var configurationOptions = new ConfigurationOptions
            {
                AbortOnConnectFail = false
            };

            configurationOptions.EndPoints.Add(options.Host, options.Port);
            return ConnectionMultiplexer.Connect(configurationOptions);
        });

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IChatGatewayService, ChatGatewayService>();
        services.AddScoped<IHealthService, HealthService>();
        services.AddScoped<IRateLimitService, RedisRateLimitService>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IUserService, UserService>();

        return services;
    }
}
