// Feature: Public Booking Token Route
// Purpose: Unit tests for GET + PATCH /api/bookings/[token]
// Added: 2026-05-22

import { BOOKING_STATUS } from "@/lib/constants/booking";
import type { PublicBooking } from "@/types";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetBookingByToken = vi.hoisted(() => vi.fn());
const mockCancelBookingByToken = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/booking.service", () => ({
  getBookingByToken: mockGetBookingByToken,
  cancelBookingByToken: mockCancelBookingByToken,
}));

import { GET, PATCH } from "./route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const INVALID_TOKEN = "not-a-uuid";

function makeBooking(overrides: Partial<PublicBooking> = {}): PublicBooking {
  return {
    id: "booking-001",
    reference_token: VALID_UUID,
    slot_id: "slot-001",
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
    created_at: "2026-05-22T10:00:00Z",
    updated_at: "2026-05-22T10:00:00Z",
    ...overrides,
  };
}

function makeGetRequest(token: string): NextRequest {
  return new NextRequest(`http://localhost/api/bookings/${token}`, {
    method: "GET",
  });
}

function makePatchRequest(token: string, body: object): NextRequest {
  return new NextRequest(`http://localhost/api/bookings/${token}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── GET /api/bookings/[token] ────────────────────────────────────────────────

describe("GET /api/bookings/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with booking data for a valid token", async () => {
    const booking = makeBooking();
    mockGetBookingByToken.mockResolvedValue({ data: booking, error: null });

    const res = await GET(makeGetRequest(VALID_UUID), {
      params: Promise.resolve({ token: VALID_UUID }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe("booking-001");
    expect(mockGetBookingByToken).toHaveBeenCalledWith(VALID_UUID);
  });

  it("returns 404 for a non-UUID token without hitting the service", async () => {
    const res = await GET(makeGetRequest(INVALID_TOKEN), {
      params: Promise.resolve({ token: INVALID_TOKEN }),
    });

    expect(res.status).toBe(404);
    expect(mockGetBookingByToken).not.toHaveBeenCalled();
  });

  it("returns 404 when booking is not found", async () => {
    mockGetBookingByToken.mockResolvedValue({
      data: null,
      error: "No rows found",
    });

    const res = await GET(makeGetRequest(VALID_UUID), {
      params: Promise.resolve({ token: VALID_UUID }),
    });

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/bookings/[token] ─────────────────────────────────────────────

describe("PATCH /api/bookings/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when cancellation succeeds", async () => {
    const cancelled = makeBooking({ status: BOOKING_STATUS.CANCELLED });
    mockCancelBookingByToken.mockResolvedValue({
      data: cancelled,
      error: null,
    });

    const res = await PATCH(
      makePatchRequest(VALID_UUID, { action: "cancel" }),
      { params: Promise.resolve({ token: VALID_UUID }) },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe(BOOKING_STATUS.CANCELLED);
    expect(mockCancelBookingByToken).toHaveBeenCalledWith(VALID_UUID);
  });

  it("returns 404 for a non-UUID token without hitting the service", async () => {
    const res = await PATCH(
      makePatchRequest(INVALID_TOKEN, { action: "cancel" }),
      { params: Promise.resolve({ token: INVALID_TOKEN }) },
    );

    expect(res.status).toBe(404);
    expect(mockCancelBookingByToken).not.toHaveBeenCalled();
  });

  it("returns 400 when body is missing action", async () => {
    const res = await PATCH(makePatchRequest(VALID_UUID, {}), {
      params: Promise.resolve({ token: VALID_UUID }),
    });

    expect(res.status).toBe(400);
    expect(mockCancelBookingByToken).not.toHaveBeenCalled();
  });

  it("returns 400 when action is unknown", async () => {
    const res = await PATCH(
      makePatchRequest(VALID_UUID, { action: "approve" }),
      { params: Promise.resolve({ token: VALID_UUID }) },
    );

    expect(res.status).toBe(400);
    expect(mockCancelBookingByToken).not.toHaveBeenCalled();
  });

  it("returns 400 when cancellation fails (invalid transition)", async () => {
    mockCancelBookingByToken.mockResolvedValue({
      data: null,
      error: "Cannot cancel a booking with status 'completed'",
    });

    const res = await PATCH(
      makePatchRequest(VALID_UUID, { action: "cancel" }),
      { params: Promise.resolve({ token: VALID_UUID }) },
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Cannot cancel");
  });
});
