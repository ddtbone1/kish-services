// Feature: Dashboard
// Purpose: Owner action to re-send the transactional email for a booking's
//          current status (Phase 8 — email delivery resend).
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResendEmailButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend_email" }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage("Email queued — it will resend shortly.");
        router.refresh();
      } else {
        setError(json.error ?? "Failed to resend the email.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 pt-1">
      <button
        type="button"
        onClick={handleResend}
        disabled={loading}
        className="h-9 px-4 self-start rounded-full text-sm font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Resending…" : "Resend status email"}
      </button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
