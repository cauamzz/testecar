import { describe, expect, it, vi, afterEach } from "vitest";
import { RateLimiter, requestIdentity } from "../../src/lib/rate-limit";
import { validatePublicSupabase } from "../../src/lib/public-env";

afterEach(() => vi.unstubAllEnvs());
describe("public credentials", () => {
  const jwt = (role: string) =>
    `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
  it("permits empty setup and publishable/anon keys only", () => {
    expect(validatePublicSupabase()).toBe(false);
    expect(
      validatePublicSupabase(
        "https://example.supabase.co",
        "sb_publishable_example",
      ),
    ).toBe(true);
    expect(
      validatePublicSupabase("https://example.supabase.co", jwt("anon")),
    ).toBe(true);
    for (const key of ["sb_secret_example", jwt("service_role"), "bad-key"])
      expect(() =>
        validatePublicSupabase("https://example.supabase.co", key),
      ).toThrow();
  });
  it("rejects partial setup, credentials in URLs and non-local HTTP", () => {
    for (const url of [
      undefined,
      "http://example.com",
      "https://user:secret@example.com",
      "https://example.com?token=secret",
    ])
      expect(() =>
        validatePublicSupabase(url, "sb_publishable_example"),
      ).toThrow();
    expect(
      validatePublicSupabase(
        "http://127.0.0.1:54321",
        "sb_publishable_example",
      ),
    ).toBe(true);
  });
});
describe("rate limiting", () => {
  it("uses the platform IP only inside Vercel", () => {
    vi.stubEnv("RATE_LIMIT_IP_HEADER", "");
    vi.stubEnv("VERCEL", "1");
    const headers = new Headers({
      "x-vercel-forwarded-for": "2001:db8::1",
      "x-forwarded-for": "1.2.3.4",
    });
    expect(requestIdentity(headers)).toBe("2001:db8::1");
    vi.stubEnv("VERCEL", "");
    expect(requestIdentity(headers)).toBe("shared");
  });
  it("limits bursts, separates keys and expires windows", () => {
    const limiter = new RateLimiter();
    expect(limiter.take("a", 2, 1000, 0).allowed).toBe(true);
    expect(limiter.take("a", 2, 1000, 10).allowed).toBe(true);
    expect(limiter.take("a", 2, 1000, 20)).toEqual({
      allowed: false,
      retryAfter: 1,
    });
    expect(limiter.take("b", 2, 1000, 20).allowed).toBe(true);
    expect(limiter.take("a", 2, 1000, 1000).allowed).toBe(true);
  });
  it("bounds memory without evicting active protection", () => {
    const limiter = new RateLimiter(1);
    expect(limiter.take("a", 1, 1000, 0).allowed).toBe(true);
    expect(limiter.take("b", 1, 1000, 0).allowed).toBe(false);
    expect(limiter.take("b", 1, 1000, 1000).allowed).toBe(true);
  });
  it("ignores spoofable IP headers unless explicitly trusted", () => {
    vi.stubEnv("RATE_LIMIT_IP_HEADER", "");
    const headers = new Headers({
      "x-forwarded-for": "1.2.3.4",
      "x-real-ip": "5.6.7.8",
    });
    expect(requestIdentity(headers)).toBe("shared");
    vi.stubEnv("RATE_LIMIT_IP_HEADER", "x-real-ip");
    expect(requestIdentity(headers)).toBe("5.6.7.8");
    headers.set("x-real-ip", "5.6.7.8, 1.2.3.4");
    expect(requestIdentity(headers)).toBe("shared");
  });
});
