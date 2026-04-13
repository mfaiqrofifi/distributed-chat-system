const defaultGatewayBaseUrl = "http://localhost:5001";
const defaultRealtimeBaseUrl = "http://localhost:5002";

export const gatewayBaseUrl =
  process.env.GATEWAY_BASE_URL ??
  process.env.NEXT_PUBLIC_GATEWAY_BASE_URL ??
  defaultGatewayBaseUrl;

export const realtimeBaseUrl =
  process.env.REALTIME_BASE_URL ??
  process.env.NEXT_PUBLIC_REALTIME_BASE_URL ??
  defaultRealtimeBaseUrl;

export async function forwardJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return fetch(input, {
    ...init,
    headers,
    cache: "no-store",
  });
}
