// Feature: Dashboard
// Purpose: Unit tests for dashboard.service.ts (metrics + booking list)
// Added: 2026-06-24

import { BOOKING_STATUS } from "@/lib/constants/booking";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockServerFrom })),
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

/** Queues per-call `from()` results in invocation order. */
function queueFromResults(results: QueryResult[]) {
  let i = 0;
  mockServerFrom.mockImplementation(() => makeQuery(results[i++]));
}

// ─── getDashboardMetrics ──────────────────────────────────────────────────────

describe("getDashboardMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates per-status counts, total, completedToday and upcoming", async () => {
    // Order of from() calls: 6 status counts (pending, confirmed, on_the_way,
    // completed, cancelled, declined), then completedToday, then upcoming.
    queueFromResults([
      { count: 0, error: null }, // pending
      { count: 0, error: null }, // confirmed
      { count: 0, error: null }, // on_the_way
      { count: 2, error: null }, // completed
      { count: 0, error: null }, // cancelled
      { count: 1, error: null }, // declined
      { count: 0, error: null }, // completedToday
      { count: 0, error: null }, // upcoming
    ]);

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
    // Matches the live data: 3 total bookings (2 completed + 1 declined).
    expect(data!.total).toBe(3);
    expect(data!.completedToday).toBe(0);
    expect(data!.upcoming).toBe(0);
  });

  it("propagates a Supabase error instead of coercing to zero", async () => {
    queueFromResults([
      { count: 0, error: null }, // pending
      { count: null, error: { message: "db exploded" } }, // confirmed fails
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
    ]);

    const { data, error } = await getDashboardMetrics();

    expect(data).toBeNull();
    expect(error).toBe("db exploded");
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
