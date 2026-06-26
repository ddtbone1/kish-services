import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Import the module under test. We re-import per describe block to reset module
// state because the in-memory store is module-level.
async function freshRateLimit() {
  vi.resetModules();
  return import("./rate-limit");
}

// ─── In-memory backend ───────────────────────────────────────────────────────

describe("checkRateLimit — in-memory fallback", () => {
  beforeEach(() => {
    // Ensure Upstash env vars are absent so in-memory path is used
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it("allows requests up to the limit", async () => {
    const { checkRateLimit } = await freshRateLimit();
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit("1.2.3.4", "test", 5, 60_000);
      expect(result.limited).toBe(false);
    }
  });

  it("blocks the (limit + 1)th request in the same window", async () => {
    const { checkRateLimit } = await freshRateLimit();
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("1.2.3.4", "block", 5, 60_000);
    }
    const result = await checkRateLimit("1.2.3.4", "block", 5, 60_000);
    expect(result.limited).toBe(true);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("resets the counter after the window expires", async () => {
    const { checkRateLimit } = await freshRateLimit();
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("1.2.3.4", "reset", 5, 60_000);
    }
    // Window expires
    vi.advanceTimersByTime(61_000);
    const result = await checkRateLimit("1.2.3.4", "reset", 5, 60_000);
    expect(result.limited).toBe(false);
  });

  it("isolates counts per bucket key (ip:key combination)", async () => {
    const { checkRateLimit } = await freshRateLimit();
    // Exhaust one bucket
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("1.2.3.4", "bucket-a", 5, 60_000);
    }
    // Different bucket should still be open
    const result = await checkRateLimit("1.2.3.4", "bucket-b", 5, 60_000);
    expect(result.limited).toBe(false);
  });
});

// ─── Upstash backend ─────────────────────────────────────────────────────────

const mockUpstashLimit = vi.hoisted(() => vi.fn());

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    constructor() {}
    limit = mockUpstashLimit;
    static slidingWindow = vi.fn(() => "sliding-window-config");
  },
}));

vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor() {}
  },
}));

describe("checkRateLimit — Upstash backend", () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.resetModules();
  });

  it("returns not limited when Upstash says success=true", async () => {
    mockUpstashLimit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
    const { checkRateLimit } = await freshRateLimit();
    const result = await checkRateLimit("1.2.3.4", "chat", 30, 60_000);
    expect(result.limited).toBe(false);
    expect(result.retryAfter).toBe(0);
  });

  it("returns limited=true with retryAfter when Upstash says success=false", async () => {
    const resetAt = Date.now() + 30_000;
    mockUpstashLimit.mockResolvedValue({ success: false, reset: resetAt });
    const { checkRateLimit } = await freshRateLimit();
    const result = await checkRateLimit("1.2.3.4", "chat", 30, 60_000);
    expect(result.limited).toBe(true);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(30);
  });

  it("passes the correct bucket key (ip:key) to Upstash", async () => {
    mockUpstashLimit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
    const { checkRateLimit } = await freshRateLimit();
    await checkRateLimit("9.8.7.6", "bookings", 5, 3_600_000);
    expect(mockUpstashLimit).toHaveBeenCalledWith("9.8.7.6:bookings");
  });
});

// ─── getClientIp ─────────────────────────────────────────────────────────────

describe("getClientIp", () => {
  afterEach(() => vi.resetModules());

  it("extracts the first IP from X-Forwarded-For", async () => {
    const { getClientIp } = await freshRateLimit();
    const req = new Request("https://example.com/api/bookings", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  it("returns 'unknown' when header is absent", async () => {
    const { getClientIp } = await freshRateLimit();
    const req = new Request("https://example.com/api/bookings");
    expect(getClientIp(req)).toBe("unknown");
  });
});
