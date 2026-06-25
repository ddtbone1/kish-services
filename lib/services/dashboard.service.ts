// Feature: Dashboard
// Purpose: Owner-dashboard metrics and booking-list queries (focused service module)
// Added: 2026-06-24

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
   * today-or-later in Asia/Manila. Day-granularity by design — a same-day slot
   * earlier than "now" still counts as upcoming for the day.
   */
  upcoming: number;
}

const ACTIVE_STATUSES: BookingStatus[] = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ON_THE_WAY,
];

/**
 * Computes all dashboard metrics with parallel count queries.
 *
 * Unlike the previous inline implementation, every query's `error` is inspected
 * and propagated — a failed query yields `{ data: null, error }`, never a silent
 * zero. This lets the UI render a distinct error state.
 *
 * @returns { data: DashboardMetrics | null, error: string | null }
 * @since 2026-06-24
 */
export async function getDashboardMetrics(): Promise<{
  data: DashboardMetrics | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const today = manilaTodayDate();
  const { startUtcISO, endUtcISO } = manilaDayRangeUtc(today);

  // One count query per status (also feeds the filter-tab counts).
  const statusList = Object.values(BOOKING_STATUS);

  const [statusResults, completedTodayRes, upcomingRes] = await Promise.all([
    Promise.all(
      statusList.map((status) =>
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("status", status),
      ),
    ),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", BOOKING_STATUS.COMPLETED)
      .gte("completed_at", startUtcISO)
      .lt("completed_at", endUtcISO),
    supabase
      .from("bookings")
      .select("id, availability_slots!inner(date)", {
        count: "exact",
        head: true,
      })
      .in("status", ACTIVE_STATUSES)
      .gte("availability_slots.date", today),
  ]);

  // Surface the first error encountered across all queries.
  const firstStatusError = statusResults.find((r) => r.error)?.error;
  const firstError =
    firstStatusError ?? completedTodayRes.error ?? upcomingRes.error;
  if (firstError) {
    return { data: null, error: firstError.message };
  }

  const counts = statusList.reduce((acc, status, i) => {
    acc[status] = statusResults[i].count ?? 0;
    return acc;
  }, {} as StatusCounts);

  const total = statusList.reduce((sum, status) => sum + counts[status], 0);

  return {
    data: {
      counts,
      total,
      completedToday: completedTodayRes.count ?? 0,
      upcoming: upcomingRes.count ?? 0,
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
 * @since 2026-06-24
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
