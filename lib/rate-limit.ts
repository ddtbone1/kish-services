// Feature: Rate Limiting
// Purpose: IP-based rate limiter with two backends:
//   - Upstash Redis (when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set)
//     Uses sliding-window counting via @upstash/ratelimit. Safe for multi-instance
//     Vercel deployments — counts are globally consistent.
//   - In-memory Map fallback (when Upstash env vars are absent)
//     Original single-instance implementation; suitable for local development.
// Updated: 2026-06-25

import type { NextRequest } from "next/server";

// ─── In-memory backend ───────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp (ms)
}

const store = new Map<string, RateLimitEntry>();

function checkRateLimitInMemory(
  ip: string,
  key: string,
  limit: number,
  windowMs: number,
): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const bucketKey = `${ip}:${key}`;

  // Evict expired entries when the store grows large to prevent memory leaks.
  if (store.size > 10_000) {
    for (const [k, entry] of store) {
      if (entry.resetAt < now) store.delete(k);
    }
  }

  const entry = store.get(bucketKey);

  if (!entry || entry.resetAt < now) {
    store.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfter: 0 };
  }

  entry.count += 1;

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false, retryAfter: 0 };
}

// ─── Upstash backend ─────────────────────────────────────────────────────────

async function checkRateLimitUpstash(
  ip: string,
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ limited: boolean; retryAfter: number }> {
  // Dynamic imports so the build succeeds even without Upstash env vars.
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    prefix: "kish:rl",
  });

  const { success, reset } = await ratelimit.limit(`${ip}:${key}`);

  if (success) return { limited: false, retryAfter: 0 };

  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  return { limited: true, retryAfter };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Checks and increments an IP-based rate limit counter.
 *
 * Delegates to Upstash Redis when env vars are configured (production),
 * or falls back to in-memory counting for local development.
 *
 * @param ip      - Client IP address
 * @param key     - Bucket identifier (e.g. "bookings", "chat")
 * @param limit   - Maximum requests allowed within the window
 * @param windowMs - Window duration in milliseconds
 * @returns { limited: boolean; retryAfter: number } — retryAfter is seconds until reset
 */
export async function checkRateLimit(
  ip: string,
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ limited: boolean; retryAfter: number }> {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return checkRateLimitUpstash(ip, key, limit, windowMs);
  }
  return checkRateLimitInMemory(ip, key, limit, windowMs);
}

/**
 * Extracts the client IP from request headers.
 * X-Forwarded-For is set by proxies / Vercel edge.
 * Falls back to "unknown" when no IP can be determined.
 */
export function getClientIp(request: NextRequest | Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}
