// Feature: Dashboard Bookings PATCH route
// Purpose: Unit tests — verifies status-change emails fire correctly
// Added: 2026-05-22

import { BOOKING_STATUS } from "@/lib/constants/booking";
import type { Booking } from "@/types";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.hoisted(() => vi.fn());
const mockUpdateBookingStatus = vi.hoisted(() => vi.fn());
const mockSendBookingEmail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/services/booking.service", () => ({
  updateBookingStatus: mockUpdateBookingStatus,
}));

vi.mock("@/lib/services/email.service", () => ({
  sendBookingEmail: mockSendBookingEmail,
}));

// Import route handler after mocks are declared
import { PATCH } from "./route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-abc",
    reference_token: "tok-xyz",
    slot_id: "slot-1",
    customer_name: "Karl Marty",
    customer_email: "customer@example.com",
    customer_phone: "09279316116",
    address_line1: "123 Main St",
    address_line2: null,
    city: "Cebu",
    notes: null,
    owner_notes: null,
    status: BOOKING_STATUS.CONFIRMED,
    completed_at: null,
    cancelled_at: null,
    declined_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeRequest(body: object): NextRequest {
  return new NextRequest(
    "http://localhost/api/dashboard/bookings/booking-abc",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

const ROUTE_PARAMS = { params: Promise.resolve({ id: "booking-abc" }) };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PATCH /api/dashboard/bookings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Authenticated owner by default
    mockGetUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });
    // sendBookingEmail resolves so fire-and-forget doesn't throw
    mockSendBookingEmail.mockResolvedValue({ error: null });
  });

  describe("update_status — email triggers", () => {
    it("fires BOOKING_CONFIRMED email when status changes to confirmed", async () => {
      const booking = makeBooking({ status: BOOKING_STATUS.CONFIRMED });
      mockUpdateBookingStatus.mockResolvedValue({ data: booking, error: null });

      const res = await PATCH(
        makeRequest({ action: "update_status", status: "confirmed" }),
        ROUTE_PARAMS,
      );

      expect(res.status).toBe(200);
      // Give fire-and-forget microtask a tick to execute
      await Promise.resolve();
      expect(mockSendBookingEmail).toHaveBeenCalledOnce();
      expect(mockSendBookingEmail).toHaveBeenCalledWith(
        expect.objectContaining({ type: "booking_confirmed" }),
      );
    });

    it("fires BOOKING_DECLINED email when status changes to declined", async () => {
      const booking = makeBooking({ status: BOOKING_STATUS.DECLINED });
      mockUpdateBookingStatus.mockResolvedValue({ data: booking, error: null });

      await PATCH(
        makeRequest({ action: "update_status", status: "declined" }),
        ROUTE_PARAMS,
      );
      await Promise.resolve();

      expect(mockSendBookingEmail).toHaveBeenCalledWith(
        expect.objectContaining({ type: "booking_declined" }),
      );
    });

    it("fires BOOKING_CANCELLED email when status changes to cancelled", async () => {
      const booking = makeBooking({ status: BOOKING_STATUS.CANCELLED });
      mockUpdateBookingStatus.mockResolvedValue({ data: booking, error: null });

      await PATCH(
        makeRequest({ action: "update_status", status: "cancelled" }),
        ROUTE_PARAMS,
      );
      await Promise.resolve();

      expect(mockSendBookingEmail).toHaveBeenCalledWith(
        expect.objectContaining({ type: "booking_cancelled" }),
      );
    });

    it("fires BOOKING_ON_THE_WAY email when status changes to on_the_way", async () => {
      const booking = makeBooking({ status: BOOKING_STATUS.ON_THE_WAY });
      mockUpdateBookingStatus.mockResolvedValue({ data: booking, error: null });

      await PATCH(
        makeRequest({ action: "update_status", status: "on_the_way" }),
        ROUTE_PARAMS,
      );
      await Promise.resolve();

      expect(mockSendBookingEmail).toHaveBeenCalledWith(
        expect.objectContaining({ type: "booking_on_the_way" }),
      );
    });

    it("fires BOOKING_COMPLETED email when status changes to completed", async () => {
      const booking = makeBooking({ status: BOOKING_STATUS.COMPLETED });
      mockUpdateBookingStatus.mockResolvedValue({ data: booking, error: null });

      await PATCH(
        makeRequest({ action: "update_status", status: "completed" }),
        ROUTE_PARAMS,
      );
      await Promise.resolve();

      expect(mockSendBookingEmail).toHaveBeenCalledWith(
        expect.objectContaining({ type: "booking_completed" }),
      );
    });

    it("does NOT fire email for non-notifiable statuses (e.g. pending)", async () => {
      const booking = makeBooking({ status: BOOKING_STATUS.PENDING });
      mockUpdateBookingStatus.mockResolvedValue({ data: booking, error: null });

      await PATCH(
        makeRequest({ action: "update_status", status: "pending" }),
        ROUTE_PARAMS,
      );
      await Promise.resolve();

      expect(mockSendBookingEmail).not.toHaveBeenCalled();
    });

    it("returns 400 and does NOT fire email when status transition is invalid", async () => {
      mockUpdateBookingStatus.mockResolvedValue({
        data: null,
        error: "Cannot transition from 'completed' to 'confirmed'",
      });

      const res = await PATCH(
        makeRequest({ action: "update_status", status: "confirmed" }),
        ROUTE_PARAMS,
      );
      await Promise.resolve();

      expect(res.status).toBe(400);
      expect(mockSendBookingEmail).not.toHaveBeenCalled();
    });
  });

  describe("auth guard", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const res = await PATCH(
        makeRequest({ action: "update_status", status: "confirmed" }),
        ROUTE_PARAMS,
      );

      expect(res.status).toBe(401);
      expect(mockUpdateBookingStatus).not.toHaveBeenCalled();
    });
  });

  describe("update_notes", () => {
    it("does not fire any email when updating owner notes", async () => {
      // Stub the supabase chain for the notes update path
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: "booking-abc",
          owner_notes: "test note",
          updated_at: new Date().toISOString(),
        },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(
        await import("@/lib/supabase/server"),
      ).createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
      } as never);

      await PATCH(
        makeRequest({ action: "update_notes", owner_notes: "note" }),
        ROUTE_PARAMS,
      );
      await Promise.resolve();

      expect(mockSendBookingEmail).not.toHaveBeenCalled();
    });
  });
});
