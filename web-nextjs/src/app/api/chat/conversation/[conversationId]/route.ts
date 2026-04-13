import { gatewayBaseUrl, forwardJson } from "@/lib/backend";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return NextResponse.json({ message: "Missing Authorization header." }, { status: 401 });
  }

  const { conversationId } = await context.params;
  const response = await forwardJson(
    `${gatewayBaseUrl}/api/messages/conversation/${encodeURIComponent(conversationId)}`,
    {
      headers: {
        Authorization: authorization,
      },
    },
  );

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}
