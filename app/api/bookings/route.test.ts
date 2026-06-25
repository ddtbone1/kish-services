// Feature: Public Booking Creation Route
// Purpose: Unit tests for POST /api/bookings — validation + status mapping
// Added: 2026-06-24

import { BOOKING_STATUS } from "@/lib/constants/booking";
import type { PublicBooking } from "@/types";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCreateBooking = vi.hoisted(() => vi.fn());
const mockSendBookingEmail = vi.hoisted(() => vi.fn());
const mockSendAdminNotification = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());

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

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── POST /api/bookings ───────────────────────────────────────────────────────

describe("POST /api/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfter: 0 });
    mockSendBookingEmail.mockResolvedValue({ error: null });
    mockSendAdminNotification.mockResolvedValue({ error: null });
  });

  it("returns 201 and triggers notifications on success", async () => {
    mockCreateBooking.mockResolvedValue({
      data: makeBooking(),
      error: null,
      code: null,
    });

    const res = await POST(makePostRequest(VALID_BODY));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.id).toBe("booking-001");
    expect(mockSendBookingEmail).toHaveBeenCalledOnce();
    expect(mockSendAdminNotification).toHaveBeenCalledOnce();
  });

  it("returns 429 when rate limited without calling the service", async () => {
    mockCheckRateLimit.mockReturnValue({ limited: true, retryAfter: 1800 });

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

  it("returns 422 when services/add-ons are invalid", async () => {
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
});
