// Feature: Dashboard
// Purpose: Owner status transition action buttons for a booking
// Added: 2026-05-22

"use client";

import type { BookingStatus } from "@/lib/constants/booking";
import {
  BOOKING_STATUS,
  VALID_STATUS_TRANSITIONS,
} from "@/lib/constants/booking";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ACTION_LABELS: Partial<Record<BookingStatus, string>> = {
  [BOOKING_STATUS.CONFIRMED]: "Confirm",
  [BOOKING_STATUS.ON_THE_WAY]: "Mark On the Way",
  [BOOKING_STATUS.COMPLETED]: "Mark Completed",
  [BOOKING_STATUS.CANCELLED]: "Cancel",
  [BOOKING_STATUS.DECLINED]: "Decline",
};

const DESTRUCTIVE_ACTIONS = new Set<BookingStatus>([
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.DECLINED,
]);

interface BookingStatusActionsProps {
  bookingId: string;
  currentStatus: BookingStatus;
}

export function BookingStatusActions({
  bookingId,
  currentStatus,
}: BookingStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<BookingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nextStatuses = VALID_STATUS_TRANSITIONS[currentStatus];
  if (nextStatuses.length === 0) return null;

  async function handleTransition(newStatus: BookingStatus) {
    let reason: string | undefined;
    if (DESTRUCTIVE_ACTIONS.has(newStatus)) {
      const entered = window.prompt(
        newStatus === BOOKING_STATUS.DECLINED
          ? "Reason for declining this booking? Example: site unsuitable, outside service area, schedule conflict."
          : "Reason for cancelling this booking?",
      );
      if (entered === null) return;
      reason = entered.trim();
      if (reason.length < 3) {
        setError("Please provide a short reason.");
        return;
      }
    }

    setLoading(newStatus);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          status: newStatus,
          ...(reason && { reason }),
        }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const json = await res.json();
        setError(json.error ?? "Status update failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-card rounded-3xl p-5 shadow-[var(--shadow-card)] flex flex-col gap-4">
      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Status Actions
      </h2>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {nextStatuses.map((status) => {
          const isDestructive = DESTRUCTIVE_ACTIONS.has(status);
          const isLoading = loading === status;
          return (
            <button
              key={status}
              type="button"
              disabled={loading !== null}
              onClick={() => handleTransition(status)}
              className={cn(
                "h-10 px-5 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                isDestructive
                  ? "border border-destructive text-destructive hover:bg-destructive/10"
                  : "bg-primary text-primary-foreground hover:opacity-80",
              )}
            >
              {isLoading ? "Updating…" : (ACTION_LABELS[status] ?? status)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
