using realtime_dotnet.Configurations;
using realtime_dotnet.Hubs;
using realtime_dotnet.Services;

var builder = WebApplication.CreateBuilder(args);
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000", "http://localhost:3010"];

builder.WebHost.UseUrls("http://0.0.0.0:5002");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerDocumentation();
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
builder.Services.AddSingleton<IUserConnectionStore, InMemoryUserConnectionStore>();
builder.Services.AddSingleton<IRealtimeMessageDispatcher, RealtimeMessageDispatcher>();
builder.Services.AddSingleton<IMessageDeliveredEventPublisher, RabbitMqMessageDeliveredEventPublisher>();
builder.Services.AddSingleton<IMessageReadEventPublisher, RabbitMqMessageReadEventPublisher>();
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddRabbitMqMessaging(builder.Configuration);
builder.Services.AddRedisPresence(builder.Configuration);
builder.Services.AddGatewayProxy(builder.Configuration);
builder.Services.AddHostedService<RabbitMqMessageConsumerService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

app.Run();
