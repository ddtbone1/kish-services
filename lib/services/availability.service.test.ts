// Feature: Availability
// Purpose: Unit tests for availability service — slots and template functions
// Added: 2026-05-22

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Supabase mock ────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

// Import after mock is declared
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  createTemplate,
  deleteTemplate,
  generateSlotsFromTemplates,
  getAvailableSlots,
  getPublicAvailabilitySlots,
  getTemplates,
} from "./availability.service";

const mockCreateClient = vi.mocked(createClient);
const mockCreateAdminClient = vi.mocked(createAdminClient);
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type AdminSupabaseClient = ReturnType<typeof createAdminClient>;

// ─── getAvailableSlots ────────────────────────────────────────────────────────

describe("getAvailableSlots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls the get_available_slots RPC and returns its rows", async () => {
    const fakeSlots = [
      {
        id: "slot-1",
        date: "2026-06-01",
        start_time: "09:00:00",
        end_time: "10:00:00",
        is_blocked: false,
      },
    ];

    const rpcMock = vi.fn().mockResolvedValue({ data: fakeSlots, error: null });
    mockCreateAdminClient.mockReturnValue({
      rpc: rpcMock,
    } as unknown as AdminSupabaseClient);

    const result = await getAvailableSlots("2026-06-01");

    expect(rpcMock).toHaveBeenCalledWith("get_available_slots", {
      p_date: "2026-06-01",
    });
    expect(result.data).toEqual(fakeSlots);
    expect(result.error).toBeNull();
  });

  it("returns error when the RPC fails", async () => {
    const rpcMock = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "DB error" } });
    mockCreateAdminClient.mockReturnValue({
      rpc: rpcMock,
    } as unknown as AdminSupabaseClient);

    const result = await getAvailableSlots("2026-06-01");

    expect(result.data).toBeNull();
    expect(result.error).toBe("DB error");
  });

  it("returns empty array when no slots are available for a date", async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: [], error: null });
    mockCreateAdminClient.mockReturnValue({
      rpc: rpcMock,
    } as unknown as AdminSupabaseClient);

    const result = await getAvailableSlots("2026-06-01");

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });
});

// ─── getTemplates ─────────────────────────────────────────────────────────────

describe("getPublicAvailabilitySlots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T01:00:00Z")); // 09:00 Asia/Manila
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns every slot with a safe public status", async () => {
    const fakeSlots = [
      {
        id: "slot-1",
        date: "2026-06-01",
        start_time: "10:00:00",
        end_time: "11:00:00",
        is_blocked: false,
        created_at: "2026-06-01T00:00:00Z",
      },
      {
        id: "slot-2",
        date: "2026-06-01",
        start_time: "11:00:00",
        end_time: "12:00:00",
        is_blocked: false,
        created_at: "2026-06-01T00:00:00Z",
      },
      {
        id: "slot-3",
        date: "2026-06-01",
        start_time: "12:00:00",
        end_time: "13:00:00",
        is_blocked: true,
        created_at: "2026-06-01T00:00:00Z",
      },
    ];

    const orderMock = vi
      .fn()
      .mockResolvedValueOnce({ data: fakeSlots, error: null });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectSlotsMock = vi.fn().mockReturnValue({ eq: eqMock });

    const inStatusMock = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ slot_id: "slot-2" }], error: null });
    const inSlotMock = vi.fn().mockReturnValue({ in: inStatusMock });
    const selectBookingsMock = vi.fn().mockReturnValue({ in: inSlotMock });

    const fromMock = vi.fn((table: string) => {
      if (table === "availability_slots") return { select: selectSlotsMock };
      if (table === "bookings") return { select: selectBookingsMock };
      throw new Error(`Unexpected table ${table}`);
    });

    mockCreateAdminClient.mockReturnValue({
      from: fromMock,
    } as unknown as AdminSupabaseClient);

    const result = await getPublicAvailabilitySlots("2026-06-01");

    expect(result.error).toBeNull();
    expect(result.data?.map((slot) => slot.availability_status)).toEqual([
      "available",
      "booked",
      "blocked",
    ]);
    expect(result.data?.map((slot) => slot.is_available)).toEqual([
      true,
      false,
      false,
    ]);
  });
});

describe("getTemplates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns templates ordered by day_of_week", async () => {
    const fakeTemplates = [
      {
        id: "t-1",
        day_of_week: 1,
        start_time: "08:00",
        end_time: "17:00",
        slot_duration_minutes: 60,
        is_active: true,
      },
      {
        id: "t-2",
        day_of_week: 2,
        start_time: "08:00",
        end_time: "17:00",
        slot_duration_minutes: 60,
        is_active: true,
      },
    ];

    const orderStartMock = vi
      .fn()
      .mockResolvedValue({ data: fakeTemplates, error: null });
    const orderDayMock = vi.fn().mockReturnValue({ order: orderStartMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderDayMock });

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ select: selectMock }),
    } as unknown as SupabaseClient);

    const result = await getTemplates();

    expect(result.data).toEqual(fakeTemplates);
    expect(result.error).toBeNull();
  });

  it("propagates Supabase error", async () => {
    const orderStartMock = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "fetch failed" } });
    const orderDayMock = vi.fn().mockReturnValue({ order: orderStartMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderDayMock });

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ select: selectMock }),
    } as unknown as SupabaseClient);

    const result = await getTemplates();

    expect(result.data).toBeNull();
    expect(result.error).toBe("fetch failed");
  });
});

// ─── createTemplate ───────────────────────────────────────────────────────────

describe("createTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the new template on success", async () => {
    const newTemplate = {
      id: "t-new",
      day_of_week: 3,
      start_time: "09:00",
      end_time: "13:00",
      slot_duration_minutes: 60,
      is_active: true,
    };

    const singleMock = vi
      .fn()
      .mockResolvedValue({ data: newTemplate, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    } as unknown as SupabaseClient);

    const result = await createTemplate({
      day_of_week: 3,
      start_time: "09:00",
      end_time: "13:00",
      slot_duration_minutes: 60,
      is_active: true,
    });

    expect(result.data).toEqual(newTemplate);
    expect(result.error).toBeNull();
  });

  it("returns error when insert fails", async () => {
    const singleMock = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "duplicate key" } });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    } as unknown as SupabaseClient);

    const result = await createTemplate({
      day_of_week: 3,
      start_time: "09:00",
      end_time: "13:00",
      slot_duration_minutes: 60,
      is_active: true,
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe("duplicate key");
  });
});

// ─── deleteTemplate ───────────────────────────────────────────────────────────

describe("deleteTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns no error on successful delete", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ delete: deleteMock }),
    } as unknown as SupabaseClient);

    const result = await deleteTemplate("t-1");

    expect(result.error).toBeNull();
    expect(eqMock).toHaveBeenCalledWith("id", "t-1");
  });

  it("propagates error on delete failure", async () => {
    const eqMock = vi
      .fn()
      .mockResolvedValue({ error: { message: "not found" } });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ delete: deleteMock }),
    } as unknown as SupabaseClient);

    const result = await deleteTemplate("t-missing");

    expect(result.error).toBe("not found");
  });
});

// ─── generateSlotsFromTemplates ───────────────────────────────────────────────

describe("generateSlotsFromTemplates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls supabase.rpc with correct params and returns inserted count", async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: 9, error: null });

    mockCreateClient.mockResolvedValue({
      rpc: rpcMock,
    } as unknown as SupabaseClient);

    const result = await generateSlotsFromTemplates({
      from: "2026-06-01",
      to: "2026-06-07",
    });

    expect(result.data).toBe(9);
    expect(result.error).toBeNull();
    expect(rpcMock).toHaveBeenCalledWith("generate_slots_from_templates", {
      p_from: "2026-06-01",
      p_to: "2026-06-07",
    });
  });

  it("returns error when rpc fails", async () => {
    const rpcMock = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "rpc error" } });

    mockCreateClient.mockResolvedValue({
      rpc: rpcMock,
    } as unknown as SupabaseClient);

    const result = await generateSlotsFromTemplates({
      from: "2026-06-01",
      to: "2026-06-07",
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe("rpc error");
  });
});
