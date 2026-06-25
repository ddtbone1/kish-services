// Feature: Dashboard
// Purpose: Validation/coercion of dashboard URL query parameters
// Added: 2026-06-24

import {
  BOOKING_STATUS_VALUES,
  type BookingStatus,
} from "@/lib/constants/booking";

/**
 * Validates a raw `status` query param against the known booking statuses.
 * Invalid or absent values are safely ignored (treated as "all bookings")
 * rather than passed verbatim into a DB filter.
 *
 * @since 2026-06-24
 */
export function parseStatusParam(raw?: string): BookingStatus | undefined {
  if (raw && (BOOKING_STATUS_VALUES as readonly string[]).includes(raw)) {
    return raw as BookingStatus;
  }
  return undefined;
}

/**
 * Coerces a raw `page` query param to a 1-based page number.
 * Non-numeric, zero, or negative values clamp to 1.
 *
 * @since 2026-06-24
 */
export function parsePage(raw?: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

/** Trims a search term and returns undefined when effectively empty. */
export function parseSearchParam(raw?: string): string | undefined {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}
