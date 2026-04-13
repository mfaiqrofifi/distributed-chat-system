FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY realtime-dotnet.csproj ./
RUN dotnet restore realtime-dotnet.csproj

COPY . ./
RUN dotnet publish realtime-dotnet.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:5002
EXPOSE 5002

COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "realtime-dotnet.dll"]
