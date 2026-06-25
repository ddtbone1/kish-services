// Feature: Shared formatting
// Purpose: Date/time display helpers shared across booking & dashboard UIs
// Added: 2026-06-24

/**
 * Formats a 24-hour "HH:MM" or "HH:MM:SS" time string as a 12-hour clock
 * label, e.g. "09:30:00" → "9:30 AM", "13:00" → "1:00 PM".
 *
 * Consolidates the identical per-file copies previously duplicated across the
 * booking form, schedule calendar, confirmation, and dashboard views.
 *
 * @since 2026-06-24
 */
export function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}
