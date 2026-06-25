// Feature: Dashboard / Scheduling
// Purpose: Asia/Manila timezone helpers for day-boundary calculations
// Added: 2026-06-24

/**
 * The business operates in Asia/Manila (PHT). Manila is a fixed UTC+8 offset
 * year-round (no daylight saving), so we can build exact UTC boundaries from a
 * calendar date by appending the "+08:00" offset.
 */
const MANILA_OFFSET = "+08:00";

/**
 * Returns "today" in Asia/Manila as a YYYY-MM-DD string.
 *
 * Uses Intl with the en-CA locale, which formats as ISO-style YYYY-MM-DD,
 * so the result is independent of the server's local timezone (UTC on Vercel).
 *
 * @param now - Optional reference instant (defaults to current time). Mainly for tests.
 * @since 2026-06-24
 */
export function manilaTodayDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Converts a Manila calendar day (YYYY-MM-DD) into a UTC instant range
 * [startUtcISO, endUtcISO) suitable for `gte`/`lt` filtering on TIMESTAMPTZ columns.
 *
 * Example: "2026-06-24" → start 2026-06-23T16:00:00Z, end 2026-06-24T16:00:00Z.
 *
 * @param date - Manila calendar date in YYYY-MM-DD format
 * @since 2026-06-24
 */
export function manilaDayRangeUtc(date: string): {
  startUtcISO: string;
  endUtcISO: string;
} {
  const start = new Date(`${date}T00:00:00${MANILA_OFFSET}`);
  // Add 24h to get the exclusive end of the Manila day.
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startUtcISO: start.toISOString(), endUtcISO: end.toISOString() };
}
