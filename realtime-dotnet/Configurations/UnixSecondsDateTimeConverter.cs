using System.Text.Json;
using System.Text.Json.Serialization;

namespace realtime_dotnet.Configurations;

public sealed class UnixSecondsDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            var stringValue = reader.GetString();

            if (DateTime.TryParse(stringValue, out var parsed))
            {
                return parsed.Kind == DateTimeKind.Utc ? parsed : parsed.ToUniversalTime();
            }
        }

        if (reader.TokenType == JsonTokenType.Number)
        {
            var unixSeconds = reader.GetDouble();
            var milliseconds = unixSeconds * 1000d;

            return DateTimeOffset.FromUnixTimeMilliseconds((long)milliseconds).UtcDateTime;
        }

        throw new JsonException("Unsupported createdAt format.");
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToUniversalTime());
    }
}
