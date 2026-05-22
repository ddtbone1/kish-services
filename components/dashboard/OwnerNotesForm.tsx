// Feature: Dashboard
// Purpose: Owner-only notes textarea — never shown to customers
// Added: 2026-05-22

"use client";

import { useState } from "react";

interface OwnerNotesFormProps {
  bookingId: string;
  initialNotes: string | null;
}

export function OwnerNotesForm({
  bookingId,
  initialNotes,
}: OwnerNotesFormProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_notes", owner_notes: notes }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        const json = await res.json();
        setError(json.error ?? "Save failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-card rounded-3xl p-5 shadow-[var(--shadow-card)] flex flex-col gap-3">
      <div>
        <h2 className="font-semibold text-base">Owner Notes</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Private — never visible to customers.
        </p>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        className="w-full rounded-2xl px-4 py-3 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        placeholder="Internal reminders, special instructions, access codes…"
        aria-label="Owner notes"
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="self-start h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save Notes"}
      </button>
    </div>
  );
}
