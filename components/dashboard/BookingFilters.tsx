// Feature: Dashboard
// Purpose: Status filter pill tabs for the bookings list
// Added: 2026-05-22

"use client";

import { BOOKING_STATUS } from "@/lib/constants/booking";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const FILTER_TABS = [
  { label: "All", value: undefined },
  { label: "Pending", value: BOOKING_STATUS.PENDING },
  { label: "Confirmed", value: BOOKING_STATUS.CONFIRMED },
  { label: "On the Way", value: BOOKING_STATUS.ON_THE_WAY },
  { label: "Completed", value: BOOKING_STATUS.COMPLETED },
] as const;

interface BookingFiltersProps {
  activeStatus?: string;
}

export function BookingFilters({ activeStatus }: BookingFiltersProps) {
  const router = useRouter();

  function setFilter(status?: string) {
    router.push(status ? `/dashboard?status=${status}` : "/dashboard");
  }

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      role="tablist"
      aria-label="Filter bookings by status"
    >
      {FILTER_TABS.map(({ label, value }) => {
        const isActive = activeStatus === value || (!activeStatus && !value);
        return (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setFilter(value)}
            className={cn(
              "flex-shrink-0 h-8 px-4 rounded-full text-xs font-medium transition-all",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border hover:bg-muted text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
