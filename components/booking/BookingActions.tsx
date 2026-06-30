// Feature: Booking
// Purpose: Customer-facing cancel/reschedule actions for active bookings
// Added: 2026-05-21

"use client";

import type { BookingStatus } from "@/lib/constants/booking";
import {
  canCustomerCancel,
  canCustomerReschedule,
} from "@/lib/constants/booking";
import {
  CANCELLATION_POLICY,
  NO_SHOW_POLICY,
  RESCHEDULE_POLICY,
  WEATHER_POLICY,
} from "@/lib/constants/policy";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BookingActionsProps {
  token: string;
  status: BookingStatus;
}

export function BookingActions({ token, status }: BookingActionsProps) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const showCancel = canCustomerCancel(status);
  const showReschedule = canCustomerReschedule(status);

  if (!showCancel && !showReschedule) return null;

  async function handleCancel() {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setError("Please add a short cancellation reason.");
      return;
    }
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: trimmedReason }),
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
        <div className="basis-full text-xs text-muted-foreground leading-relaxed">
          <p>{CANCELLATION_POLICY.text}</p>
          <p>{RESCHEDULE_POLICY.text}</p>
          <p>{WEATHER_POLICY.text}</p>
          <p>{NO_SHOW_POLICY.text}</p>
        </div>
        {showReschedule && (
          <a
            href="/chat"
            className="inline-flex items-center justify-center h-10 px-5 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Reschedule
          </a>
        )}
        {showCancel && (
          <div className="basis-full flex flex-col gap-2">
            <label htmlFor="cancel_reason" className="text-xs font-medium">
              Cancellation reason
            </label>
            <textarea
              id="cancel_reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-2xl px-4 py-3 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Tell us why you need to cancel..."
            />
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex items-center justify-center h-10 px-5 rounded-full border border-border text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-start"
            >
              {cancelling ? "Cancelling..." : "Cancel Booking"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
