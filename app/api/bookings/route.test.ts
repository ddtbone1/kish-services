// Feature: Public Booking Creation Route
// Purpose: Unit tests for POST /api/bookings — validation, idempotency, status mapping
// Updated: 2026-06-25

import { BOOKING_STATUS } from "@/lib/constants/booking";
import type { PublicBooking } from "@/types";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCreateBooking = vi.hoisted(() => vi.fn());
const mockSendBookingEmail = vi.hoisted(() => vi.fn());
const mockSendAdminNotification = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockCheckIdempotencyKey = vi.hoisted(() => vi.fn());
const mockStoreIdempotencyKey = vi.hoisted(() => vi.fn());
const mockHashBody = vi.hoisted(() => vi.fn(() => "deadbeef"));
const mockRevalidateTag = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/booking.service", () => ({
  createBooking: mockCreateBooking,
}));

vi.mock("@/lib/services/email.service", () => ({
  sendBookingEmail: mockSendBookingEmail,
  sendAdminNotification: mockSendAdminNotification,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/idempotency", () => ({
  checkIdempotencyKey: mockCheckIdempotencyKey,
  storeIdempotencyKey: mockStoreIdempotencyKey,
  hashBody: mockHashBody,
}));

// withRequestContext just calls fn() directly — no AsyncLocalStorage in tests
vi.mock("@/lib/utils/with-request-context", () => ({
  withRequestContext: vi.fn((_req: unknown, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("next/cache", () => ({
  revalidateTag: mockRevalidateTag,
}));

import { POST } from "./route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_BODY = {
  slot_id: "550e8400-e29b-41d4-a716-446655440000",
  service_ids: ["660e8400-e29b-41d4-a716-446655440000"],
  customer_name: "Karl Marty",
  customer_email: "karl@example.com",
  address_line1: "123 Main St",
  city: "General Santos City",
};

function makeBooking(overrides: Partial<PublicBooking> = {}): PublicBooking {
  return {
    id: "booking-001",
    reference_token: "tok-001",
    slot_id: VALID_BODY.slot_id,
    customer_name: "Karl Marty",
    customer_email: "karl@example.com",
    customer_phone: null,
    address_line1: "123 Main St",
    address_line2: null,
    city: "General Santos City",
    notes: null,
    status: BOOKING_STATUS.PENDING,
    completed_at: null,
    cancelled_at: null,
    declined_at: null,
    created_at: "2026-06-24T10:00:00Z",
    updated_at: "2026-06-24T10:00:00Z",
    ...overrides,
  };
}

function makePostRequest(body: unknown, headers?: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

// ─── POST /api/bookings ───────────────────────────────────────────────────────

describe("POST /api/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // checkRateLimit is now async
    mockCheckRateLimit.mockResolvedValue({ limited: false, retryAfter: 0 });
    mockSendBookingEmail.mockResolvedValue({ error: null });
    mockSendAdminNotification.mockResolvedValue({ error: null });
    // Default: no idempotency key used (fresh key)
    mockCheckIdempotencyKey.mockResolvedValue({ status: "new" });
    mockStoreIdempotencyKey.mockResolvedValue(undefined);
  });

  it("returns 201 and notifies owner but does NOT email customer on submission", async () => {
    mockCreateBooking.mockResolvedValue({
      data: makeBooking(),
      error: null,
      code: null,
    });

    const res = await POST(makePostRequest(VALID_BODY));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.id).toBe("booking-001");
    // Customer email is deferred until owner confirms/declines — not sent on submission
    expect(mockSendBookingEmail).not.toHaveBeenCalled();
    expect(mockSendAdminNotification).toHaveBeenCalledOnce();
  });

  it("returns 429 when rate limited without calling the service", async () => {
    mockCheckRateLimit.mockResolvedValue({ limited: true, retryAfter: 1800 });

    const res = await POST(makePostRequest(VALID_BODY));

    expect(res.status).toBe(429);
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body without calling the service", async () => {
    const res = await POST(makePostRequest({ ...VALID_BODY, service_ids: [] }));

    expect(res.status).toBe(400);
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it("returns 400 for duplicate service_ids", async () => {
    const dupe = VALID_BODY.service_ids[0];
    const res = await POST(
      makePostRequest({ ...VALID_BODY, service_ids: [dupe, dupe] }),
    );

    expect(res.status).toBe(400);
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it("returns 409 when the slot is no longer available", async () => {
    mockCreateBooking.mockResolvedValue({
      data: null,
      error: "Selected slot has already been reserved",
      code: "conflict",
    });

    const res = await POST(makePostRequest(VALID_BODY));

    expect(res.status).toBe(409);
    expect(mockSendBookingEmail).not.toHaveBeenCalled();
  });

  it("returns 422 when services are invalid", async () => {
    mockCreateBooking.mockResolvedValue({
      data: null,
      error: "One or more selected services are unavailable",
      code: "invalid",
    });

    const res = await POST(makePostRequest(VALID_BODY));

    expect(res.status).toBe(422);
  });

  it("returns 500 on an unexpected service error", async () => {
    mockCreateBooking.mockResolvedValue({
      data: null,
      error: "boom",
      code: "error",
    });

    const res = await POST(makePostRequest(VALID_BODY));

    expect(res.status).toBe(500);
  });

  // ─── Idempotency ────────────────────────────────────────────────────────────

  describe("Idempotency-Key header", () => {
    const KEY = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

    it("returns 200 with cached response on replay", async () => {
      mockCheckIdempotencyKey.mockResolvedValue({
        status: "replay",
        record: {
          response_body: { data: { id: "cached-booking" } },
          status_code: 201,
        },
      });

      const res = await POST(
        makePostRequest(VALID_BODY, { "idempotency-key": KEY }),
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe("cached-booking");
      // Should NOT reach the booking service
      expect(mockCreateBooking).not.toHaveBeenCalled();
    });

    it("returns 422 when same key is reused with a different body", async () => {
      mockCheckIdempotencyKey.mockResolvedValue({ status: "hash_mismatch" });

      const res = await POST(
        makePostRequest(VALID_BODY, { "idempotency-key": KEY }),
      );

      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.error).toContain("Idempotency-Key");
      expect(mockCreateBooking).not.toHaveBeenCalled();
    });

    it("returns 500 when idempotency DB check itself errors", async () => {
      mockCheckIdempotencyKey.mockResolvedValue({
        status: "error",
        error: "DB connection failed",
      });

      const res = await POST(
        makePostRequest(VALID_BODY, { "idempotency-key": KEY }),
      );

      expect(res.status).toBe(500);
      expect(mockCreateBooking).not.toHaveBeenCalled();
    });

    it("stores the idempotency key after a successful booking creation", async () => {
      mockCreateBooking.mockResolvedValue({
        data: makeBooking(),
        error: null,
        code: null,
      });

      await POST(makePostRequest(VALID_BODY, { "idempotency-key": KEY }));

      expect(mockStoreIdempotencyKey).toHaveBeenCalledOnce();
      expect(mockStoreIdempotencyKey).toHaveBeenCalledWith(
        KEY,
        "deadbeef",
        expect.objectContaining({ data: expect.any(Object) }),
        201,
      );
    });

    it("does NOT store idempotency key when booking creation fails", async () => {
      mockCreateBooking.mockResolvedValue({
        data: null,
        error: "slot conflict",
        code: "conflict",
      });

      await POST(makePostRequest(VALID_BODY, { "idempotency-key": KEY }));

      expect(mockStoreIdempotencyKey).not.toHaveBeenCalled();
    });

    it("proceeds normally when no Idempotency-Key header is sent", async () => {
      mockCreateBooking.mockResolvedValue({
        data: makeBooking(),
        error: null,
        code: null,
      });

      const res = await POST(makePostRequest(VALID_BODY));

      expect(res.status).toBe(201);
      // checkIdempotencyKey should NOT have been called without the header
      expect(mockCheckIdempotencyKey).not.toHaveBeenCalled();
      expect(mockStoreIdempotencyKey).not.toHaveBeenCalled();
    });
  });
});
