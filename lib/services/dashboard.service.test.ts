// Feature: Dashboard
// Purpose: Unit tests for dashboard.service.ts (metrics + booking list)
// Updated: 2026-06-25 — updated mocks for rpc("get_booking_counts") refactor

import { BOOKING_STATUS } from "@/lib/constants/booking";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.hoisted(() => vi.fn());
const mockServerRpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
    rpc: mockServerRpc,
  })),
}));

import { getBookings, getDashboardMetrics } from "./dashboard.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type QueryResult = { data?: unknown; error?: unknown; count?: number | null };

const CHAIN_METHODS = [
  "select",
  "eq",
  "gte",
  "lt",
  "in",
  "ilike",
  "order",
  "range",
] as const;

/**
 * Builds a thenable Supabase query-builder mock. Every chain method returns the
 * same builder; awaiting at any point resolves to `result`. This mirrors the
 * real PostgREST builder (chainable + thenable) without modelling each chain.
 */
function makeQuery(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  for (const m of CHAIN_METHODS) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (
    resolve: (v: QueryResult) => unknown,
    reject: (e: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

// ─── getDashboardMetrics ──────────────────────────────────────────────────────

describe("getDashboardMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates per-status counts, total, completedToday and upcoming via rpc", async () => {
    // rpc("get_booking_counts") returns aggregated row in data array
    mockServerRpc.mockResolvedValue({
      data: [
        {
          pending: 0n,
          confirmed: 0n,
          on_the_way: 0n,
          completed: 2n,
          cancelled: 0n,
          declined: 1n,
          total: 3n,
          completed_today: 0n,
        },
      ],
      error: null,
    });

    // from("bookings") for upcoming join query
    mockServerFrom.mockReturnValue(makeQuery({ count: 0, error: null }));

    const { data, error } = await getDashboardMetrics();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.counts).toEqual({
      pending: 0,
      confirmed: 0,
      on_the_way: 0,
      completed: 2,
      cancelled: 0,
      declined: 1,
    });
    expect(data!.total).toBe(3);
    expect(data!.completedToday).toBe(0);
    expect(data!.upcoming).toBe(0);

    // rpc was called with the correct function name
    expect(mockServerRpc).toHaveBeenCalledWith(
      "get_booking_counts",
      expect.objectContaining({ p_start: expect.any(String), p_end: expect.any(String) }),
    );
  });

  it("propagates a Supabase rpc error instead of coercing to zero", async () => {
    mockServerRpc.mockResolvedValue({
      data: null,
      error: { message: "db exploded" },
    });
    // upcoming query — not reached but mock it to avoid null dereference
    mockServerFrom.mockReturnValue(makeQuery({ count: 0, error: null }));

    const { data, error } = await getDashboardMetrics();

    expect(data).toBeNull();
    expect(error).toBe("db exploded");
  });

  it("propagates the upcoming query error", async () => {
    mockServerRpc.mockResolvedValue({
      data: [
        {
          pending: 0n, confirmed: 0n, on_the_way: 0n,
          completed: 0n, cancelled: 0n, declined: 0n,
          total: 0n, completed_today: 0n,
        },
      ],
      error: null,
    });
    mockServerFrom.mockReturnValue(makeQuery({ count: null, error: { message: "upcoming failed" } }));

    const { data, error } = await getDashboardMetrics();

    expect(data).toBeNull();
    expect(error).toBe("upcoming failed");
  });
});

// ─── getBookings ──────────────────────────────────────────────────────────────

describe("getBookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns rows and total on success", async () => {
    const rows = [
      { id: "b1", customer_name: "Karl", status: BOOKING_STATUS.COMPLETED },
    ];
    const query = makeQuery({ data: rows, error: null, count: 1 });
    mockServerFrom.mockReturnValue(query);

    const { data, error } = await getBookings({ page: 1, pageSize: 20 });

    expect(error).toBeNull();
    expect(data!.rows).toHaveLength(1);
    expect(data!.total).toBe(1);
    // Pagination window applied: range(0, 19)
    expect(query.range).toHaveBeenCalledWith(0, 19);
  });

  it("applies status and search filters", async () => {
    const query = makeQuery({ data: [], error: null, count: 0 });
    mockServerFrom.mockReturnValue(query);

    await getBookings({
      status: BOOKING_STATUS.PENDING,
      q: "Karl",
      page: 2,
      pageSize: 20,
    });

    expect(query.eq).toHaveBeenCalledWith("status", BOOKING_STATUS.PENDING);
    expect(query.ilike).toHaveBeenCalledWith("customer_name", "%Karl%");
    // Page 2 → offset 20
    expect(query.range).toHaveBeenCalledWith(20, 39);
  });

  it("propagates query errors", async () => {
    const query = makeQuery({
      data: null,
      error: { message: "select failed" },
      count: null,
    });
    mockServerFrom.mockReturnValue(query);

    const { data, error } = await getBookings({ page: 1, pageSize: 20 });

    expect(data).toBeNull();
    expect(error).toBe("select failed");
  });
});
