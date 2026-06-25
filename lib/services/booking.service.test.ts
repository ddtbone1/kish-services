// Feature: Booking Service
// Purpose: Unit tests for all booking.service.ts functions
// Added: 2026-05-22

import {
  BOOKING_STATUS,
  VALID_STATUS_TRANSITIONS,
} from "@/lib/constants/booking";
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
  cancelBookingByToken,
  createBooking,
  getBookingByToken,
  updateBookingStatus,
} from "./booking.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BOOKING_ID = "booking-uuid-001";
const REF_TOKEN = "550e8400-e29b-41d4-a716-446655440000";

function makePublicBooking(
  overrides: Partial<PublicBooking> = {},
): PublicBooking {
  return {
    id: BOOKING_ID,
    reference_token: REF_TOKEN,
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

// Builds a chainable Supabase query mock for admin client (no async createClient)
function buildAdminChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const eq = vi.fn().mockReturnValue({ single, select });
  const update = vi
    .fn()
    .mockReturnValue({
      eq: vi
        .fn()
        .mockReturnValue({ select: vi.fn().mockReturnValue({ single }) }),
    });
  const insert = vi
    .fn()
    .mockReturnValue({ select: vi.fn().mockReturnValue({ single }) });
  const inFn = vi
    .fn()
    .mockReturnValue({ eq: vi.fn().mockReturnValue({ single }) });
  mockAdminFrom.mockReturnValue({ select, eq, update, insert, in: inFn });
  return { single, select, eq };
}

// Builds a chainable Supabase query mock for server client (async createClient)
function buildServerChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const eq = vi.fn().mockReturnValue({ single, select });
  const update = vi
    .fn()
    .mockReturnValue({
      eq: vi
        .fn()
        .mockReturnValue({ select: vi.fn().mockReturnValue({ single }) }),
    });
  mockServerFrom.mockReturnValue({ select, eq, update });
  return { single, select, eq, update };
}

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
  const INPUT = {
    slot_id: "550e8400-e29b-41d4-a716-446655440000",
    service_ids: ["660e8400-e29b-41d4-a716-446655440000"],
    add_on_ids: ["770e8400-e29b-41d4-a716-446655440000"],
    customer_name: "Karl Marty",
    customer_email: "karl@example.com",
    customer_phone: undefined,
    address_line1: "123 Main St",
    address_line2: undefined,
    city: "General Santos City",
    notes: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
      p_add_on_ids: INPUT.add_on_ids,
      p_customer_name: INPUT.customer_name,
      p_customer_email: INPUT.customer_email,
      p_customer_phone: null,
      p_address_line1: INPUT.address_line1,
      p_address_line2: null,
      p_city: INPUT.city,
      p_notes: null,
    });
  });

  it("defaults add_on_ids to an empty array when omitted", async () => {
    mockAdminRpc.mockResolvedValue({ data: makePublicBooking(), error: null });

    const { add_on_ids: _omit, ...noAddOns } = INPUT;
    void _omit;
    await createBooking(noAddOns);

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

  it("maps PT422 (invalid services/add-ons) to invalid", async () => {
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
      data: { id: BOOKING_ID, status: BOOKING_STATUS.PENDING },
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
      data: { id: BOOKING_ID, status: BOOKING_STATUS.COMPLETED },
      error: null,
    });
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single }),
      }),
    });

    const result = await cancelBookingByToken(REF_TOKEN);

    expect(result.data).toBeNull();
    expect(result.error).toContain("Cannot cancel");
  });

  it("returns error when cancellation is not allowed (e.g. declined → cancel)", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: BOOKING_ID, status: BOOKING_STATUS.DECLINED },
      error: null,
    });
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single }),
      }),
    });

    const result = await cancelBookingByToken(REF_TOKEN);

    expect(result.data).toBeNull();
    expect(result.error).toContain("Cannot cancel");
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
