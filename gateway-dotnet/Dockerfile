FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY gateway-dotnet.csproj ./
RUN dotnet restore gateway-dotnet.csproj

COPY . ./
RUN dotnet publish gateway-dotnet.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:5001
EXPOSE 5001

COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "gateway-dotnet.dll"]
