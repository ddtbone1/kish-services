// Feature: Booking
// Purpose: Customer-facing cancel action pill for pending/confirmed bookings
// Added: 2026-05-21

"use client";

import type { BookingStatus } from "@/lib/constants/booking";
import { BOOKING_STATUS } from "@/lib/constants/booking";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BookingActionsProps {
  token: string;
  status: BookingStatus;
}

export function BookingActions({ token, status }: BookingActionsProps) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAct =
    status === BOOKING_STATUS.PENDING || status === BOOKING_STATUS.CONFIRMED;

  if (!canAct) return null;

  async function handleCancel() {
    if (!window.confirm("Are you sure you want to cancel this booking?")) {
      return;
    }
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const json = await res.json();
        setError(json.error ?? "Failed to cancel. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p
          role="alert"
          className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <a
          href="/chat"
          className="inline-flex items-center justify-center h-10 px-5 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          Reschedule
        </a>
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          className="inline-flex items-center justify-center h-10 px-5 rounded-full border border-border text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelling ? "Cancelling…" : "Cancel Booking"}
        </button>
      </div>
    </div>
  );
}
