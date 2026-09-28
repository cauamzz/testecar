// Basic per-process protection. Production edge/WAF limits must cover all replicas.
// Never trust arbitrary X-Forwarded-For supplied by the caller.
import { createHash } from "node:crypto";
import { isIP } from "node:net";

type Bucket = { count: number; resetAt: number };
export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  constructor(private maxKeys = 10_000) {}
  take(key: string, limit: number, windowMs: number, now = Date.now()) {
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (this.buckets.size >= this.maxKeys) {
        for (const [id, value] of this.buckets)
          if (value.resetAt <= now) this.buckets.delete(id);
        if (this.buckets.size >= this.maxKeys && !bucket)
          return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) };
      }
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count++;
    return {
      allowed: bucket.count <= limit,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
}
const limiter = new RateLimiter();
export function requestIdentity(headers: Pick<Headers, "get">) {
  // Enable only when the hosting proxy overwrites this header and cannot be bypassed.
  const name =
    process.env.RATE_LIMIT_IP_HEADER ||
    (process.env.VERCEL === "1" ? "x-vercel-forwarded-for" : undefined);
  const raw = name ? headers.get(name)?.trim() : undefined;
  return raw && isIP(raw) ? raw : "shared";
}
export function checkRateLimit(
  scope: string,
  identity: string,
  limit: number,
  windowMs = 60_000,
) {
  const key = createHash("sha256").update(`${scope}:${identity}`).digest("hex");
  return limiter.take(key, limit, windowMs);
}
export function tooManyRequests(retryAfter: number) {
  return Response.json(
    { message: "Muitas solicitações. Aguarde e tente novamente." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "Cache-Control": "no-store",
      },
    },
  );
}
