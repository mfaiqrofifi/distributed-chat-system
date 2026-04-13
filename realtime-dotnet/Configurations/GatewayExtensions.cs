using Microsoft.Extensions.Options;
using realtime_dotnet.Services;

namespace realtime_dotnet.Configurations;

public static class GatewayExtensions
{
    public static IServiceCollection AddGatewayProxy(this IServiceCollection services, IConfiguration configuration)
    {
        var options = configuration.GetSection(GatewayOptions.SectionName).Get<GatewayOptions>()
            ?? throw new InvalidOperationException("Gateway settings are missing.");

        if (string.IsNullOrWhiteSpace(options.BaseUrl))
        {
            throw new InvalidOperationException("Gateway BaseUrl is missing.");
        }

        services.Configure<GatewayOptions>(configuration.GetSection(GatewayOptions.SectionName));

        services.AddHttpClient<IGatewayChatProxyClient, GatewayChatProxyClient>((serviceProvider, httpClient) =>
        {
            var gatewayOptions = serviceProvider.GetRequiredService<IOptions<GatewayOptions>>().Value;
            httpClient.BaseAddress = new Uri(gatewayOptions.BaseUrl);
        });

        return services;
    }
}
