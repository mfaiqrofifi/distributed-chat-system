import { realtimeBaseUrl, forwardJson } from "@/lib/backend";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { userId } = await context.params;
  const response = await forwardJson(
    `${realtimeBaseUrl}/api/presence/${encodeURIComponent(userId)}`,
  );

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}
