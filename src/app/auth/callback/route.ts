import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import {
  checkRateLimit,
  requestIdentity,
  tooManyRequests,
} from "@/lib/rate-limit";
export async function GET(request: NextRequest) {
  const rate = checkRateLimit(
    "auth-callback",
    requestIdentity(request.headers),
    20,
  );
  if (!rate.allowed) return tooManyRequests(rate.retryAfter);
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const client = await serverClient();
  if (code && client) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(next === "/gestao-nv-8f4c2a/conta" ? next : "/gestao-nv-8f4c2a", request.url),
      );
  }
  return NextResponse.redirect(
    new URL("/", request.url),
  );
}
