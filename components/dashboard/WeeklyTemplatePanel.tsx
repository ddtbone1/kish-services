// Feature: Availability Templates
// Purpose: Dashboard panel to manage weekly availability templates and generate slots
// Added: 2026-05-22

"use client";

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils/datetime";
import type { AvailabilityTemplate } from "@/types";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Slot duration options in minutes */
const DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

/** Generate a YYYY-MM-DD string N days from today */
function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Collapsible panel shown below the ScheduleCalendar on the dashboard schedule
 * page. Lets the owner:
 *  - View all weekly availability templates
 *  - Add new templates (day, start, end, slot duration)
 *  - Delete existing templates
 *  - Generate availability slots for a chosen date range
 */
export function WeeklyTemplatePanel() {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add-template form state
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [duration, setDuration] = useState(60);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Generate-slots form state
  const [genFrom, setGenFrom] = useState(offsetDate(0));
  const [genTo, setGenTo] = useState(offsetDate(28));
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/availability/templates");
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Failed to load templates");
      else setTemplates(json.data ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when panel is first opened
  useEffect(() => {
    if (open && templates.length === 0 && !loading) {
      fetchTemplates();
    }
  }, [open, templates.length, loading, fetchTemplates]);

  async function handleAddTemplate(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/availability/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          slot_duration_minutes: duration,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAddError(json.error ?? "Failed to create template");
      } else {
        setTemplates((prev) =>
          [...prev, json.data].sort((a, b) =>
            a.day_of_week !== b.day_of_week
              ? a.day_of_week - b.day_of_week
              : a.start_time.localeCompare(b.start_time),
          ),
        );
      }
    } catch {
      setAddError("Network error");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(id);
    try {
      const res = await fetch(`/api/availability/templates/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      }
    } finally {
      setDeleteLoading(null);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setGenResult(null);
    setGenError(null);
    try {
      const res = await fetch("/api/availability/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: genFrom, to: genTo }),
      });
      const json = await res.json();
      if (!res.ok) {
        setGenError(json.error ?? "Generation failed");
      } else {
        setGenResult(
          `${json.data.inserted} new slot${json.data.inserted !== 1 ? "s" : ""} created`,
        );
      }
    } catch {
      setGenError("Network error");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
      >
        <div className="text-left">
          <p className="font-semibold text-sm">Weekly Schedule Templates</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define recurring weekly slots and bulk-generate availability
          </p>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-5 py-5 flex flex-col gap-6">
          {/* ── Template list ── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Active Templates
            </h3>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {!loading && !error && templates.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No templates yet — add one below to get started.
              </p>
            )}

            {templates.length > 0 && (
              <ul className="flex flex-col gap-2">
                {templates.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-medium w-24">
                        {DAY_NAMES[t.day_of_week]}
                      </span>
                      <span className="text-muted-foreground">
                        {formatTime(t.start_time)} – {formatTime(t.end_time)}
                      </span>
                      <span className="text-xs bg-muted rounded-full px-2 py-0.5">
                        {t.slot_duration_minutes} min slots
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      disabled={deleteLoading === t.id}
                      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                      aria-label={`Delete ${DAY_NAMES[t.day_of_week]} template`}
                    >
                      {deleteLoading === t.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Add template form ── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Add Template
            </h3>
            <form
              onSubmit={handleAddTemplate}
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {/* Day of week */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Day</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="h-9 rounded-xl border border-border bg-secondary px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {DAY_NAMES.map((name, i) => (
                    <option key={i} value={i}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start time */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Start</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-9 rounded-xl border border-border bg-secondary px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              {/* End time */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">End</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-9 rounded-xl border border-border bg-secondary px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              {/* Slot duration */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Slot</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="h-9 rounded-xl border border-border bg-secondary px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {DURATION_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={adding}
                className={cn(
                  "col-span-2 sm:col-span-4 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold",
                  "hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2",
                )}
              >
                {adding ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Add Template
              </button>
            </form>

            {addError && (
              <p className="text-sm text-destructive mt-2">{addError}</p>
            )}
          </div>

          {/* ── Generate slots ── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Generate Slots
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Creates all slots from active templates for the chosen date range.
              Existing slots are never overwritten.
            </p>
            <form
              onSubmit={handleGenerate}
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">From</label>
                <input
                  type="date"
                  value={genFrom}
                  min={offsetDate(0)}
                  onChange={(e) => setGenFrom(e.target.value)}
                  className="h-9 rounded-xl border border-border bg-secondary px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">To</label>
                <input
                  type="date"
                  value={genTo}
                  min={genFrom}
                  onChange={(e) => setGenTo(e.target.value)}
                  className="h-9 rounded-xl border border-border bg-secondary px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={generating || templates.length === 0}
                className={cn(
                  "col-span-2 h-9 rounded-xl bg-accent text-accent-foreground text-sm font-semibold",
                  "hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2",
                )}
              >
                {generating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Generate Slots"
                )}
              </button>
            </form>

            {genResult && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">
                ✓ {genResult}
              </p>
            )}
            {genError && (
              <p className="text-sm text-destructive mt-2">{genError}</p>
            )}
            {templates.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Add at least one template before generating slots.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
