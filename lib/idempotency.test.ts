import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = vi.hoisted(() => vi.fn());
const mockEq = vi.hoisted(() => vi.fn());
const mockSingle = vi.hoisted(() => vi.fn());
const mockInsert = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const mockLt = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
    })),
  })),
}));

// Silence logger output during tests
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  requestContext: { getStore: vi.fn() },
}));

// ─── Setup chainable mocks ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Chain: from().select().eq().single()
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ single: mockSingle });

  // Chain: from().delete().lt()
  mockDelete.mockReturnValue({ lt: mockLt });
  mockLt.mockReturnValue({
    then: (fn: (result: { error: null }) => unknown) => fn({ error: null }),
  });

  // Default single() — key not found
  mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116", message: "not found" } });

  // Default insert() — success
  mockInsert.mockResolvedValue({ error: null });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

import { checkIdempotencyKey, hashBody, storeIdempotencyKey } from "./idempotency";

describe("hashBody", () => {
  it("returns a hex string", () => {
    const hash = hashBody('{"foo":"bar"}');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    expect(hashBody("abc")).toBe(hashBody("abc"));
  });

  it("differs for different inputs", () => {
    expect(hashBody("abc")).not.toBe(hashBody("def"));
  });
});

describe("checkIdempotencyKey", () => {
  it("returns 'new' when key does not exist (PGRST116)", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "no rows" },
    });

    const result = await checkIdempotencyKey("key-1", "hash-1");
    expect(result.status).toBe("new");
  });

  it("returns 'replay' with cached record when key and hash match", async () => {
    mockSingle.mockResolvedValue({
      data: {
        body_hash: "hash-match",
        response_body: { data: { id: "booking-1" } },
        status_code: 201,
      },
      error: null,
    });

    const result = await checkIdempotencyKey("key-2", "hash-match");
    expect(result.status).toBe("replay");
    if (result.status === "replay") {
      expect(result.record.status_code).toBe(201);
      expect(result.record.response_body).toEqual({ data: { id: "booking-1" } });
    }
  });

  it("returns 'hash_mismatch' when key exists but hash differs", async () => {
    mockSingle.mockResolvedValue({
      data: {
        body_hash: "original-hash",
        response_body: {},
        status_code: 201,
      },
      error: null,
    });

    const result = await checkIdempotencyKey("key-3", "different-hash");
    expect(result.status).toBe("hash_mismatch");
  });

  it("returns 'error' on unexpected DB failure (non-PGRST116)", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: "42P01", message: "relation does not exist" },
    });

    const result = await checkIdempotencyKey("key-4", "hash-4");
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error).toContain("relation does not exist");
    }
  });

  it("fires lazy cleanup without blocking the result", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "no rows" },
    });

    const result = await checkIdempotencyKey("key-5", "hash-5");
    expect(result.status).toBe("new");
    // Cleanup fires via .then() on the delete chain — just assert delete was called
    expect(mockDelete).toHaveBeenCalledOnce();
    expect(mockLt).toHaveBeenCalledOnce();
  });
});

describe("storeIdempotencyKey", () => {
  it("inserts a row with the correct fields and a future expires_at", async () => {
    const before = Date.now();
    await storeIdempotencyKey("key-store", "hash-x", { data: {} }, 201);
    const after = Date.now();

    expect(mockInsert).toHaveBeenCalledOnce();
    const inserted = mockInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.key).toBe("key-store");
    expect(inserted.body_hash).toBe("hash-x");
    expect(inserted.status_code).toBe(201);

    const expiresAt = new Date(inserted.expires_at as string).getTime();
    expect(expiresAt).toBeGreaterThan(before + 23 * 60 * 60 * 1000);
    expect(expiresAt).toBeLessThan(after + 25 * 60 * 60 * 1000);
  });

  it("logs an error but does not throw when the insert fails", async () => {
    mockInsert.mockResolvedValue({ error: { message: "DB failure" } });

    // Should not throw
    await expect(
      storeIdempotencyKey("key-fail", "hash-f", {}, 201),
    ).resolves.toBeUndefined();
  });
});
