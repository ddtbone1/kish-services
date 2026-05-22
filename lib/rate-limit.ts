// Feature: Rate Limiting
// Purpose: In-process IP-based rate limiter using a module-level Map.
//          Suitable for single-instance deployments. For multi-instance
//          deployments (e.g. Vercel with concurrent lambdas), upgrade to
//          Redis-backed counting (@upstash/ratelimit).
// Added: 2026-05-22

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp (ms)
}

// Module-level store — persists across requests within the same process.
const store = new Map<string, RateLimitEntry>();

/**
 * Checks and increments an IP-based rate limit counter.
 *
 * @param ip      - Client IP address (from X-Forwarded-For or fallback key)
 * @param key     - Bucket identifier (e.g. "bookings", "chat")
 * @param limit   - Maximum requests allowed within the window
 * @param windowMs - Window duration in milliseconds
 * @returns { limited: boolean; retryAfter: number } — retryAfter is seconds until reset
 */
export function checkRateLimit(
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
    // New window — reset counter
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

/**
 * Extracts the client IP from request headers.
 * X-Forwarded-For is set by proxies / Vercel edge.
 * Falls back to "unknown" when no IP can be determined.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // X-Forwarded-For can be a comma-separated list; first entry is the client
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}
