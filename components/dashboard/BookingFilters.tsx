// Feature: Dashboard
// Purpose: Status filter pill tabs (with counts) for the bookings list
// Added: 2026-05-22
// Updated: 2026-06-24 — added counts, Declined/Cancelled tabs, search preservation

"use client";

import { BOOKING_STATUS, type BookingStatus } from "@/lib/constants/booking";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

const FILTER_TABS = [
  { label: "All", value: undefined },
  { label: "Pending", value: BOOKING_STATUS.PENDING },
  { label: "Confirmed", value: BOOKING_STATUS.CONFIRMED },
  { label: "On the Way", value: BOOKING_STATUS.ON_THE_WAY },
  { label: "Completed", value: BOOKING_STATUS.COMPLETED },
  { label: "Declined", value: BOOKING_STATUS.DECLINED },
  { label: "Cancelled", value: BOOKING_STATUS.CANCELLED },
] as const;

interface BookingFiltersProps {
  activeStatus?: string;
  /** Per-status counts for the tab badges. */
  counts: Record<BookingStatus, number>;
  /** Total across all statuses (the "All" tab badge). */
  total: number;
}

export function BookingFilters({
  activeStatus,
  counts,
  total,
}: BookingFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(status?: string) {
    // Preserve the active search term; reset pagination when changing filter.
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const qs = params.toString();
    router.push(qs ? `/dashboard?${qs}` : "/dashboard");
  }

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      role="tablist"
      aria-label="Filter bookings by status"
    >
      {FILTER_TABS.map(({ label, value }) => {
        const isActive = activeStatus === value || (!activeStatus && !value);
        const count = value ? counts[value] : total;
        return (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setFilter(value)}
            className={cn(
              "flex-shrink-0 h-8 px-4 rounded-full text-xs font-medium transition-all inline-flex items-center gap-1.5",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border hover:bg-muted text-foreground",
            )}
          >
            <span>{label}</span>
            <span
              className={cn(
                "tabular-nums",
                isActive ? "opacity-80" : "text-muted-foreground",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
