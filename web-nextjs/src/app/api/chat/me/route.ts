import { gatewayBaseUrl, forwardJson } from "@/lib/backend";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return NextResponse.json({ message: "Missing Authorization header." }, { status: 401 });
  }

  const response = await forwardJson(`${gatewayBaseUrl}/api/me`, {
    headers: {
      Authorization: authorization,
    },
  });

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}
