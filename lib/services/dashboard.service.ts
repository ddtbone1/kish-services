// Feature: Dashboard
// Purpose: Owner-dashboard metrics and booking-list queries (focused service module)
// Updated: 2026-06-25 — replaced 8 parallel COUNT queries with single rpc() call

import { BOOKING_STATUS, type BookingStatus } from "@/lib/constants/booking";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { manilaDayRangeUtc, manilaTodayDate } from "@/lib/utils/timezone";
import type { BookingListItem } from "@/types";

/** Per-status booking counts (drives both the filter tabs and derived totals). */
export type StatusCounts = Record<BookingStatus, number>;

export interface DashboardMetrics {
  /** Count of bookings per status. */
  counts: StatusCounts;
  /** All bookings, all statuses (sum of `counts`). */
  total: number;
  /** Bookings completed within the current Asia/Manila calendar day. */
  completedToday: number;
  /**
   * Active bookings (pending/confirmed/on_the_way) whose scheduled slot date is
   * today-or-later in Asia/Manila. Day-granularity by design.
   */
  upcoming: number;
}

const ACTIVE_STATUSES: BookingStatus[] = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ON_THE_WAY,
];

const COUNTED_STATUSES: BookingStatus[] = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ON_THE_WAY,
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.DECLINED,
];

const ZERO_COUNTS: StatusCounts = {
  [BOOKING_STATUS.PENDING]: 0,
  [BOOKING_STATUS.CONFIRMED]: 0,
  [BOOKING_STATUS.ON_THE_WAY]: 0,
  [BOOKING_STATUS.COMPLETED]: 0,
  [BOOKING_STATUS.CANCELLED]: 0,
  [BOOKING_STATUS.DECLINED]: 0,
};

function toCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function metricsFromCounts(
  counts: StatusCounts,
  completedToday: number,
  upcoming: number,
): DashboardMetrics {
  return {
    counts,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
    completedToday,
    upcoming,
  };
}

function countsFromRpcRow(row: Record<string, unknown>): StatusCounts {
  return {
    [BOOKING_STATUS.PENDING]: toCount(row.pending),
    [BOOKING_STATUS.CONFIRMED]: toCount(row.confirmed),
    [BOOKING_STATUS.ON_THE_WAY]: toCount(row.on_the_way),
    [BOOKING_STATUS.COMPLETED]: toCount(row.completed),
    [BOOKING_STATUS.CANCELLED]: toCount(row.cancelled),
    [BOOKING_STATUS.DECLINED]: toCount(row.declined),
  };
}

async function getFallbackBookingCounts(
  supabase: ReturnType<typeof createAdminClient>,
  startUtcISO: string,
  endUtcISO: string,
): Promise<{
  counts: StatusCounts | null;
  completedToday: number;
  error: string | null;
}> {
  const [statusResults, completedTodayRes] = await Promise.all([
    Promise.all(
      COUNTED_STATUSES.map((status) =>
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", status),
      ),
    ),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", BOOKING_STATUS.COMPLETED)
      .gte("completed_at", startUtcISO)
      .lt("completed_at", endUtcISO),
  ]);

  const failedStatus = statusResults.find((result) => result.error);
  if (failedStatus?.error) {
    return {
      counts: null,
      completedToday: 0,
      error: failedStatus.error.message,
    };
  }

  if (completedTodayRes.error) {
    return {
      counts: null,
      completedToday: 0,
      error: completedTodayRes.error.message,
    };
  }

  const counts: StatusCounts = { ...ZERO_COUNTS };
  COUNTED_STATUSES.forEach((status, index) => {
    counts[status] = statusResults[index].count ?? 0;
  });

  return {
    counts,
    completedToday: completedTodayRes.count ?? 0,
    error: null,
  };
}

/**
 * Computes all dashboard metrics using 2 database calls.
 *
 * Previously ran 8 parallel SELECT count(*) queries (one per status + two
 * derived counts). Now delegates to get_booking_counts() — a SECURITY DEFINER
 * SQL function that returns all per-status counts and completedToday in a
 * single table scan with conditional aggregation.
 *
 * Uses the service-role admin client (not the cookie-bound server client) so it
 * can run inside unstable_cache() — accessing cookies() within a cache scope is
 * unsupported. Safe because the dashboard layout already enforces auth and these
 * counts are global (not user-scoped).
 *
 * @returns { data: DashboardMetrics | null, error: string | null }
 * @since 2026-06-25
 */
export async function getDashboardMetrics(): Promise<{
  data: DashboardMetrics | null;
  error: string | null;
}> {
  const supabase = createAdminClient();
  const today = manilaTodayDate();
  const { startUtcISO, endUtcISO } = manilaDayRangeUtc(today);

  const [countsRes, upcomingRes] = await Promise.all([
    supabase.rpc("get_booking_counts", {
      p_start: startUtcISO,
      p_end: endUtcISO,
    }),
    supabase
      .from("bookings")
      .select("id, availability_slots!inner(date)", {
        count: "exact",
        head: true,
      })
      .in("status", ACTIVE_STATUSES)
      .gte("availability_slots.date", today),
  ]);

  if (upcomingRes.error) {
    return { data: null, error: upcomingRes.error.message };
  }

  if (countsRes.error) {
    const fallback = await getFallbackBookingCounts(
      supabase,
      startUtcISO,
      endUtcISO,
    );
    if (fallback.error || !fallback.counts) {
      return { data: null, error: fallback.error ?? countsRes.error.message };
    }

    return {
      data: metricsFromCounts(
        fallback.counts,
        fallback.completedToday,
        upcomingRes.count ?? 0,
      ),
      error: null,
    };
  }

  // RETURNS TABLE gives an array; the aggregation always yields exactly one row.
  const row = (countsRes.data as Record<string, unknown>[])?.[0];

  if (!row) {
    return { data: null, error: "get_booking_counts returned no rows" };
  }

  return {
    data: metricsFromCounts(
      countsFromRpcRow(row),
      toCount(row.completed_today),
      upcomingRes.count ?? 0,
    ),
    error: null,
  };
}

export interface GetBookingsParams {
  status?: BookingStatus;
  q?: string;
  page: number;
  pageSize: number;
}

export interface BookingsPage {
  rows: BookingListItem[];
  total: number;
}

/**
 * Fetches a paginated, optionally filtered/searched page of bookings for the
 * owner dashboard list. Errors are propagated rather than coerced to `[]`.
 *
 * @returns { data: { rows, total } | null, error: string | null }
 */
export async function getBookings({
  status,
  q,
  page,
  pageSize,
}: GetBookingsParams): Promise<{
  data: BookingsPage | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("bookings")
    .select(
      `id, reference_token, customer_name, city, status, created_at,
       booking_items(price_at_booking, service:services(name)),
       slot:availability_slots!slot_id(date, start_time)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status) {
    query = query.eq("status", status);
  }
  if (q) {
    query = query.ilike("customer_name", `%${q}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: {
      rows: (data ?? []) as unknown as BookingListItem[],
      total: count ?? 0,
    },
    error: null,
  };
}
