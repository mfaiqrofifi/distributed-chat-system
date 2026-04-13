import { gatewayBaseUrl, forwardJson } from "@/lib/backend";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return NextResponse.json({ message: "Missing Authorization header." }, { status: 401 });
  }

  const body = await request.text();

  const response = await forwardJson(`${gatewayBaseUrl}/api/messages`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body,
  });

  const text = await response.text();
  const headers = new Headers();
  headers.set("Content-Type", response.headers.get("Content-Type") ?? "application/json");

  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    headers.set("Retry-After", retryAfter);
  }

  return new NextResponse(text, {
    status: response.status,
    headers,
  });
}
