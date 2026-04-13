using Microsoft.Extensions.Options;
using realtime_dotnet.Services;
using StackExchange.Redis;

namespace realtime_dotnet.Configurations;

public static class RedisExtensions
{
    public static IServiceCollection AddRedisPresence(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<RedisOptions>(configuration.GetSection(RedisOptions.SectionName));

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

        services.AddSingleton<IRedisPresenceService, RedisPresenceService>();
        services.AddHostedService<PresenceHeartbeatService>();

        return services;
    }
}
