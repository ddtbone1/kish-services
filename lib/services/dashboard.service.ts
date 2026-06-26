// Feature: Dashboard
// Purpose: Owner-dashboard metrics and booking-list queries (focused service module)
// Updated: 2026-06-25 — replaced 8 parallel COUNT queries with single rpc() call

import { BOOKING_STATUS, type BookingStatus } from "@/lib/constants/booking";
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

/**
 * Computes all dashboard metrics using 2 database calls.
 *
 * Previously ran 8 parallel SELECT count(*) queries (one per status + two
 * derived counts). Now delegates to get_booking_counts() — a SECURITY DEFINER
 * SQL function that returns all per-status counts and completedToday in a
 * single table scan with conditional aggregation.
 *
 * @returns { data: DashboardMetrics | null, error: string | null }
 * @since 2026-06-25
 */
export async function getDashboardMetrics(): Promise<{
  data: DashboardMetrics | null;
  error: string | null;
}> {
  const supabase = await createClient();
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

  if (countsRes.error) {
    return { data: null, error: countsRes.error.message };
  }
  if (upcomingRes.error) {
    return { data: null, error: upcomingRes.error.message };
  }

  // RETURNS TABLE gives an array; the aggregation always yields exactly one row.
  const row = (countsRes.data as Record<string, unknown>[])?.[0];

  if (!row) {
    return { data: null, error: "get_booking_counts returned no rows" };
  }

  const counts: StatusCounts = {
    [BOOKING_STATUS.PENDING]:    Number(row.pending)    ?? 0,
    [BOOKING_STATUS.CONFIRMED]:  Number(row.confirmed)  ?? 0,
    [BOOKING_STATUS.ON_THE_WAY]: Number(row.on_the_way) ?? 0,
    [BOOKING_STATUS.COMPLETED]:  Number(row.completed)  ?? 0,
    [BOOKING_STATUS.CANCELLED]:  Number(row.cancelled)  ?? 0,
    [BOOKING_STATUS.DECLINED]:   Number(row.declined)   ?? 0,
  };

  return {
    data: {
      counts,
      total:          Number(row.total)           ?? 0,
      completedToday: Number(row.completed_today) ?? 0,
      upcoming:       upcomingRes.count           ?? 0,
    },
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
