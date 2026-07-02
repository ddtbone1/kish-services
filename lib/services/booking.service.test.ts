// Feature: Booking Service
// Purpose: Unit tests for all booking.service.ts functions
// Added: 2026-05-22

import {
  BOOKING_STATUS,
  VALID_STATUS_TRANSITIONS,
} from "@/lib/constants/booking";
import {
  BOOKING_TERMS_VERSION,
  PRIVACY_NOTICE_VERSION,
} from "@/lib/constants/policy";
import type { CreateBookingInput } from "@/lib/validations/booking";
import type { Booking, PublicBooking } from "@/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.hoisted(() => vi.fn());
const mockAdminRpc = vi.hoisted(() => vi.fn());
const mockServerFrom = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom, rpc: mockAdminRpc })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockServerFrom })),
}));

import {
  assessBookingRisk,
  cancelBookingByToken,
  createBooking,
  getBookingByToken,
  updateBookingStatus,
} from "./booking.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BOOKING_ID = "booking-uuid-001";
const REF_TOKEN = "550e8400-e29b-41d4-a716-446655440000";
const FUTURE_SLOT = { date: "2099-05-22", start_time: "10:00:00" };

function makePublicBooking(
  overrides: Partial<PublicBooking> = {},
): PublicBooking {
  return {
    id: BOOKING_ID,
    reference_token: REF_TOKEN,
    slot_id: "slot-001",
    customer_name: "Karl Marty",
    customer_email: "karl@example.com",
    customer_phone: "+639171234567",
    address_line1: "123 Main St",
    address_line2: null,
    city: "General Santos",
    notes: null,
    status: BOOKING_STATUS.PENDING,
    privacy_notice_version: null,
    terms_version: null,
    customer_consent_at: null,
    transactional_contact_consent: false,
    environmental_ack_version: null,
    environmental_ack_at: null,
    vehicle_type: null,
    vehicle_details: null,
    parking_available: null,
    water_available: null,
    electric_available: null,
    access_instructions: null,
    site_safety_notes: null,
    completed_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    cancellation_policy_version: null,
    cancelled_by: null,
    declined_at: null,
    status_reason: null,
    created_at: "2026-05-22T10:00:00Z",
    updated_at: "2026-05-22T10:00:00Z",
    ...overrides,
  };
}

// Builds a chainable Supabase query mock for admin client (no async createClient)
// ─── getBookingByToken ────────────────────────────────────────────────────────

describe("getBookingByToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns booking data on success", async () => {
    const booking = makePublicBooking();
    const single = vi.fn().mockResolvedValue({ data: booking, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    mockAdminFrom.mockReturnValue({ select });

    const result = await getBookingByToken(REF_TOKEN);

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ id: BOOKING_ID });
  });

  it("returns error when booking is not found", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "No rows found" },
    });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    mockAdminFrom.mockReturnValue({ select });

    const result = await getBookingByToken(REF_TOKEN);

    expect(result.data).toBeNull();
    expect(result.error).toBe("No rows found");
  });

  it("does not include owner_notes in the select columns", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    mockAdminFrom.mockReturnValue({ select });

    await getBookingByToken(REF_TOKEN);

    const selectArg: string = select.mock.calls[0][0];
    expect(selectArg).not.toContain("owner_notes");
  });
});

// ─── createBooking (atomic RPC) ───────────────────────────────────────────────

describe("createBooking", () => {
  const INPUT: CreateBookingInput = {
    slot_id: "550e8400-e29b-41d4-a716-446655440000",
    service_ids: ["660e8400-e29b-41d4-a716-446655440000"],
    customer_name: "Karl Marty",
    customer_email: "karl@example.com",
    customer_phone: "+639171234567",
    address_line1: "123 Main St",
    address_line2: undefined,
    city: "General Santos",
    notes: undefined,
    accept_terms_privacy: true,
    environmental_acknowledgement: true,
    vehicle_type: "sedan",
    parking_available: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  it("calls create_booking RPC with mapped params and returns the row (no owner_notes)", async () => {
    const row = {
      ...makePublicBooking(),
      owner_notes: "secret internal note",
    };
    mockAdminRpc.mockResolvedValue({ data: row, error: null });

    const result = await createBooking(INPUT);

    expect(result.error).toBeNull();
    expect(result.code).toBeNull();
    expect(result.data).toMatchObject({ id: BOOKING_ID });
    expect(result.data).not.toHaveProperty("owner_notes");

    expect(mockAdminRpc).toHaveBeenCalledWith("create_booking", {
      p_slot_id: INPUT.slot_id,
      p_service_ids: INPUT.service_ids,
      p_add_on_ids: [],
      p_customer_name: INPUT.customer_name,
      p_customer_email: INPUT.customer_email,
      p_customer_phone: INPUT.customer_phone,
      p_address_line1: INPUT.address_line1,
      p_address_line2: null,
      p_city: INPUT.city,
      p_notes: null,
      // Consent is server-stamped, not taken from the client input.
      p_privacy_notice_version: PRIVACY_NOTICE_VERSION,
      p_terms_version: BOOKING_TERMS_VERSION,
      p_transactional_contact_consent: true,
      p_vehicle_type: "sedan",
      p_vehicle_details: null,
      p_parking_available: true,
      p_water_available: null,
      p_electric_available: null,
      p_access_instructions: null,
      p_site_safety_notes: null,
    });
  });

  it("always sends an empty add-on array to the legacy RPC parameter", async () => {
    mockAdminRpc.mockResolvedValue({ data: makePublicBooking(), error: null });

    await createBooking(INPUT);

    expect(mockAdminRpc.mock.calls[0][1].p_add_on_ids).toEqual([]);
  });

  it("maps PT409 (slot taken) to a conflict", async () => {
    mockAdminRpc.mockResolvedValue({
      data: null,
      error: { code: "PT409", message: "Selected slot has already been reserved" },
    });

    const result = await createBooking(INPUT);

    expect(result.data).toBeNull();
    expect(result.code).toBe("conflict");
    expect(result.error).toContain("reserved");
  });

  it("maps a 23505 unique-index race to a conflict", async () => {
    mockAdminRpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });

    const result = await createBooking(INPUT);

    expect(result.code).toBe("conflict");
  });

  it("maps PT422 (invalid services) to invalid", async () => {
    mockAdminRpc.mockResolvedValue({
      data: null,
      error: { code: "PT422", message: "One or more selected services are unavailable" },
    });

    const result = await createBooking(INPUT);

    expect(result.data).toBeNull();
    expect(result.code).toBe("invalid");
  });

  it("maps an unknown SQLSTATE to a generic error", async () => {
    mockAdminRpc.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "internal error" },
    });

    const result = await createBooking(INPUT);

    expect(result.code).toBe("error");
  });
});

// ─── cancelBookingByToken ─────────────────────────────────────────────────────

describe("cancelBookingByToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels a pending booking and returns updated data", async () => {
    const cancelled = makePublicBooking({
      status: BOOKING_STATUS.CANCELLED,
      cancelled_at: "2026-05-22T11:00:00Z",
    });

    // First call: fetch current status
    const singleFetch = vi.fn().mockResolvedValue({
      data: {
        id: BOOKING_ID,
        status: BOOKING_STATUS.PENDING,
        slot: FUTURE_SLOT,
      },
      error: null,
    });
    // Second call: update + select
    const singleUpdate = vi
      .fn()
      .mockResolvedValue({ data: cancelled, error: null });

    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: singleFetch }),
          }),
        };
      }
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: singleUpdate }),
          }),
        }),
      };
    });

    const result = await cancelBookingByToken(REF_TOKEN);

    expect(result.error).toBeNull();
    expect(result.data?.status).toBe(BOOKING_STATUS.CANCELLED);
    expect(result.data?.cancelled_at).not.toBeNull();
  });

  it("returns error when booking is not found", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "No rows found" },
    });
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single }),
      }),
    });

    const result = await cancelBookingByToken(REF_TOKEN);

    expect(result.data).toBeNull();
    expect(result.error).toBe("Booking not found");
  });

  it("returns error when cancellation is not allowed (e.g. completed → cancel)", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: BOOKING_ID,
        status: BOOKING_STATUS.COMPLETED,
        slot: FUTURE_SLOT,
      },
      error: null,
    });
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single }),
      }),
    });

    const result = await cancelBookingByToken(REF_TOKEN);

    expect(result.data).toBeNull();
    expect(result.error).toContain("Self-service cancellation");
  });

  it("returns error when cancellation is not allowed (e.g. declined → cancel)", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: BOOKING_ID,
        status: BOOKING_STATUS.DECLINED,
        slot: FUTURE_SLOT,
      },
      error: null,
    });
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single }),
      }),
    });

    const result = await cancelBookingByToken(REF_TOKEN);

    expect(result.data).toBeNull();
    expect(result.error).toContain("Self-service cancellation");
  });

  it("returns error when the customer cancellation cutoff has passed", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: BOOKING_ID,
        status: BOOKING_STATUS.PENDING,
        slot: { date: "2020-05-22", start_time: "10:00:00" },
      },
      error: null,
    });
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single }),
      }),
    });

    const result = await cancelBookingByToken(REF_TOKEN);

    expect(result.data).toBeNull();
    expect(result.error).toContain("12 hours before");
  });
});

// ─── updateBookingStatus ──────────────────────────────────────────────────────

describe("updateBookingStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupServerMock(
    currentStatus: string,
    updateResult: { data: Booking | null; error: { message: string } | null },
  ) {
    const singleFetch = vi.fn().mockResolvedValue({
      data: { status: currentStatus },
      error: null,
    });
    const singleUpdate = vi.fn().mockResolvedValue(updateResult);

    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: singleFetch }),
          }),
        };
      }
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: singleUpdate }),
          }),
        }),
      };
    });
  }

  const VALID_TRANSITIONS: Array<[string, string]> = [
    [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED],
    [BOOKING_STATUS.PENDING, BOOKING_STATUS.DECLINED],
    [BOOKING_STATUS.PENDING, BOOKING_STATUS.CANCELLED],
    [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ON_THE_WAY],
    [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CANCELLED],
    [BOOKING_STATUS.ON_THE_WAY, BOOKING_STATUS.COMPLETED],
  ];

  it.each(VALID_TRANSITIONS)("allows transition: %s → %s", async (from, to) => {
    const updated = makePublicBooking({
      status: to as (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS],
    });
    setupServerMock(from, { data: updated as unknown as Booking, error: null });

    const result = await updateBookingStatus(
      BOOKING_ID,
      to as (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS],
    );

    expect(result.error).toBeNull();
    expect(result.data?.status).toBe(to);
  });

  it("sets completed_at when transitioning to completed", async () => {
    const updated = makePublicBooking({
      status: BOOKING_STATUS.COMPLETED,
      completed_at: "2026-05-22T12:00:00Z",
    });
    setupServerMock(BOOKING_STATUS.ON_THE_WAY, {
      data: updated as unknown as Booking,
      error: null,
    });

    const result = await updateBookingStatus(
      BOOKING_ID,
      BOOKING_STATUS.COMPLETED,
    );
    expect(result.data?.completed_at).not.toBeNull();
  });

  it("sets cancelled_at when transitioning to cancelled", async () => {
    const updated = makePublicBooking({
      status: BOOKING_STATUS.CANCELLED,
      cancelled_at: "2026-05-22T12:00:00Z",
    });
    setupServerMock(BOOKING_STATUS.CONFIRMED, {
      data: updated as unknown as Booking,
      error: null,
    });

    const result = await updateBookingStatus(
      BOOKING_ID,
      BOOKING_STATUS.CANCELLED,
    );
    expect(result.data?.cancelled_at).not.toBeNull();
  });

  it("sets declined_at when transitioning to declined", async () => {
    const updated = makePublicBooking({
      status: BOOKING_STATUS.DECLINED,
      declined_at: "2026-05-22T12:00:00Z",
    });
    setupServerMock(BOOKING_STATUS.PENDING, {
      data: updated as unknown as Booking,
      error: null,
    });

    const result = await updateBookingStatus(
      BOOKING_ID,
      BOOKING_STATUS.DECLINED,
    );
    expect(result.data?.declined_at).not.toBeNull();
  });

  it("rejects invalid transition: completed → confirmed", async () => {
    setupServerMock(BOOKING_STATUS.COMPLETED, { data: null, error: null });

    const result = await updateBookingStatus(
      BOOKING_ID,
      BOOKING_STATUS.CONFIRMED,
    );

    expect(result.data).toBeNull();
    expect(result.error).toContain("Cannot transition");
    expect(result.error).toContain("completed");
  });

  it("rejects invalid transition: cancelled → on_the_way", async () => {
    setupServerMock(BOOKING_STATUS.CANCELLED, { data: null, error: null });

    const result = await updateBookingStatus(
      BOOKING_ID,
      BOOKING_STATUS.ON_THE_WAY,
    );

    expect(result.data).toBeNull();
    expect(result.error).toContain("Cannot transition");
  });

  it("returns error when booking is not found", async () => {
    mockServerFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Not found" },
          }),
        }),
      }),
    });

    const result = await updateBookingStatus(
      BOOKING_ID,
      BOOKING_STATUS.CONFIRMED,
    );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("VALID_STATUS_TRANSITIONS covers all statuses as keys", () => {
    const allStatuses = Object.values(BOOKING_STATUS);
    const transitionKeys = Object.keys(VALID_STATUS_TRANSITIONS);
    expect(transitionKeys.sort()).toEqual(allStatuses.sort());
  });
});

// ─── assessBookingRisk ────────────────────────────────────────────────────────

describe("assessBookingRisk", () => {
  const base: CreateBookingInput = {
    slot_id: "550e8400-e29b-41d4-a716-446655440000",
    service_ids: ["660e8400-e29b-41d4-a716-446655440000"],
    customer_name: "Karl Marty",
    customer_email: "karl@example.com",
    customer_phone: "0917 123 4567",
    address_line1: "123 Real Street",
    city: "General Santos", // core service area
    accept_terms_privacy: true,
    environmental_acknowledgement: true,
    vehicle_type: "sedan",
    parking_available: true,
  };

  const codes = (input: CreateBookingInput) =>
    assessBookingRisk(input).map((f) => f.code);

  it("returns no flags for a clean booking", () => {
    expect(codes(base)).toEqual([]);
  });

  it("flags a vague address (too short or no digit)", () => {
    expect(codes({ ...base, address_line1: "Near plaza" })).toContain(
      "vague_address",
    );
  });

  it("flags a weak/missing phone (< 7 digits)", () => {
    expect(codes({ ...base, customer_phone: "12345" })).toContain("weak_phone");
    expect(codes({ ...base, customer_phone: "" })).toContain("weak_phone");
  });

  it("flags an extended/manual-review service area", () => {
    expect(codes({ ...base, city: "Surallah" })).toContain("location_review");
  });

  it("flags site resources ONLY when explicitly false (not 'Not sure')", () => {
    expect(codes({ ...base, water_available: false })).toContain(
      "site_resources_uncertain",
    );
    // undefined = "Not sure" (the default) must NOT flag — avoids noise.
    expect(codes({ ...base, water_available: undefined })).not.toContain(
      "site_resources_uncertain",
    );
  });
});
