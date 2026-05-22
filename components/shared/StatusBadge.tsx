// Feature: Booking
// Purpose: Visual status badge for all booking status values
// Added: 2026-05-21

import type { BookingStatus } from "@/lib/constants/booking";
import { BOOKING_STATUS } from "@/lib/constants/booking";
import { cn } from "@/lib/utils";

/**
 * Maps each BookingStatus to a Tailwind class pair (bg + text).
 * Colours must match the `--status-*` CSS custom properties in globals.css.
 */
const STATUS_STYLES: Record<BookingStatus, string> = {
  // amber — visible on white card backgrounds
  [BOOKING_STATUS.PENDING]:
    "bg-amber-50 text-amber-700 border border-amber-200",
  // blue
  [BOOKING_STATUS.CONFIRMED]: "bg-blue-50 text-blue-700 border border-blue-200",
  // purple
  [BOOKING_STATUS.ON_THE_WAY]:
    "bg-purple-50 text-purple-700 border border-purple-200",
  // green
  [BOOKING_STATUS.COMPLETED]:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  // gray
  [BOOKING_STATUS.CANCELLED]:
    "bg-gray-100 text-gray-600 border border-gray-200",
  // red
  [BOOKING_STATUS.DECLINED]: "bg-red-50 text-red-700 border border-red-200",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  [BOOKING_STATUS.PENDING]: "Pending",
  [BOOKING_STATUS.CONFIRMED]: "Confirmed",
  [BOOKING_STATUS.ON_THE_WAY]: "On the Way",
  [BOOKING_STATUS.COMPLETED]: "Completed",
  [BOOKING_STATUS.CANCELLED]: "Cancelled",
  [BOOKING_STATUS.DECLINED]: "Declined",
};

interface StatusBadgeProps {
  /** The booking status value from BOOKING_STATUS constants */
  status: BookingStatus;
  className?: string;
}

/**
 * Renders a pill-shaped status badge for a booking.
 * Colour is driven by the booking status — never use raw colours directly.
 *
 * @param status - BookingStatus value from BOOKING_STATUS constants
 * @param className - Optional additional classes
 * @returns Accessible status badge span
 * @since 2026-05-21
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        STATUS_STYLES[status],
        className,
      )}
      aria-label={`Booking status: ${STATUS_LABELS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
