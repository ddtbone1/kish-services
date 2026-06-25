// Feature: Dashboard
// Purpose: Interactive month calendar for availability slot management
// Added: 2026-05-22

"use client";

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils/datetime";
import type { AvailabilitySlot } from "@/types";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthBounds(year: number, month: number) {
  const from = new Date(year, month, 1).toISOString().split("T")[0];
  const to = new Date(year, month + 1, 0).toISOString().split("T")[0];
  return { from, to };
}

function padDate(n: number) {
  return String(n).padStart(2, "0");
}

export function ScheduleCalendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Add slot form
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchSlots = useCallback(async (year: number, month: number) => {
    setLoading(true);
    const { from, to } = getMonthBounds(year, month);
    try {
      const res = await fetch(`/api/availability?from=${from}&to=${to}`);
      const json = await res.json();
      setSlots(json.data ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots(viewYear, viewMonth);
  }, [viewYear, viewMonth, fetchSlots]);

  function goToPrevMonth() {
    setSelectedDate(null);
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    setSelectedDate(null);
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  async function handleToggleBlock(slot: AvailabilitySlot) {
    setToggleLoading(slot.id);
    try {
      const res = await fetch(`/api/availability/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_blocked: !slot.is_blocked }),
      });
      if (res.ok) {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slot.id ? { ...s, is_blocked: !s.is_blocked } : s,
          ),
        );
      }
    } finally {
      setToggleLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this slot?")) return;
    setDeleteLoading(id);
    try {
      const res = await fetch(`/api/availability/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSlots((prev) => prev.filter((s) => s.id !== id));
      }
    } finally {
      setDeleteLoading(null);
    }
  }

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newDate,
          start_time: newStart,
          end_time: newEnd,
        }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setSlots((prev) =>
          [...prev, json.data as AvailabilitySlot].sort((a, b) =>
            a.date < b.date
              ? -1
              : a.date > b.date
                ? 1
                : a.start_time < b.start_time
                  ? -1
                  : 1,
          ),
        );
        setNewDate("");
        setNewStart("");
        setNewEnd("");
      } else {
        setAddError(json.error ?? "Failed to add slot.");
      }
    } catch {
      setAddError("Network error.");
    } finally {
      setAdding(false);
    }
  }

  // Calendar grid
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );
  const todayStr = today.toISOString().split("T")[0];

  function getDateStr(day: number) {
    return `${viewYear}-${padDate(viewMonth + 1)}-${padDate(day)}`;
  }

  function getSlotsForDay(day: number) {
    return slots.filter((s) => s.date === getDateStr(day));
  }

  const selectedSlots = selectedDate
    ? slots.filter((s) => s.date === selectedDate)
    : [];

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      {/* Left column: calendar + add slot form */}
      <div className="flex flex-col gap-4 lg:w-80 flex-shrink-0">
        {/* Month calendar */}
        <div className="bg-card rounded-3xl p-5 shadow-[var(--shadow-card)]">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPrevMonth}
              aria-label="Previous month"
              className="size-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <span className="font-semibold text-sm">{monthLabel}</span>
            <button
              type="button"
              onClick={goToNextMonth}
              aria-label="Next month"
              className="size-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_OF_WEEK.map((d) => (
              <div
                key={d}
                className="text-center text-xs text-muted-foreground py-1 font-medium"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2
                className="size-5 animate-spin text-muted-foreground"
                aria-label="Loading"
              />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const dateStr = getDateStr(day);
                const daySlots = getSlotsForDay(day);
                const hasAvailable = daySlots.some((s) => !s.is_blocked);
                const hasBlocked = daySlots.some((s) => s.is_blocked);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-2xl aspect-square text-xs font-medium transition-all gap-0.5 p-0.5",
                      isSelected && "bg-primary text-primary-foreground",
                      !isSelected &&
                        isToday &&
                        "bg-accent/20 text-accent font-bold",
                      !isSelected &&
                        !isToday &&
                        daySlots.length > 0 &&
                        "bg-muted",
                      !isSelected &&
                        !isToday &&
                        daySlots.length === 0 &&
                        "hover:bg-muted/50",
                    )}
                    aria-label={`${dateStr}${isSelected ? ", selected" : ""}`}
                    aria-pressed={isSelected}
                  >
                    <span>{day}</span>
                    {daySlots.length > 0 && (
                      <div className="flex gap-0.5">
                        {hasAvailable && (
                          <span className="size-1 rounded-full bg-emerald-500" />
                        )}
                        {hasBlocked && (
                          <span className="size-1 rounded-full bg-amber-400" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-400" />
              Blocked
            </span>
          </div>
        </div>

        {/* Add slot form */}
        <div className="bg-card rounded-3xl p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
            <Plus className="size-4" aria-hidden="true" />
            Add Slot
          </h2>
          <form onSubmit={handleAddSlot} className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="new-date"
                className="block text-xs font-medium mb-1"
              >
                Date
              </label>
              <input
                id="new-date"
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full h-10 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="new-start"
                  className="block text-xs font-medium mb-1"
                >
                  Start
                </label>
                <input
                  id="new-start"
                  type="time"
                  required
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full h-10 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label
                  htmlFor="new-end"
                  className="block text-xs font-medium mb-1"
                >
                  End
                </label>
                <input
                  id="new-end"
                  type="time"
                  required
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="w-full h-10 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            {addError && (
              <p role="alert" className="text-xs text-destructive">
                {addError}
              </p>
            )}
            <button
              type="submit"
              disabled={adding}
              className="w-full h-10 rounded-full bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? "Adding…" : "Add Slot"}
            </button>
          </form>
        </div>
      </div>

      {/* Right panel: day slot list */}
      <div className="flex-1">
        {selectedDate ? (
          <div className="bg-card rounded-3xl p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-semibold text-base mb-4">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                "en-US",
                {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                },
              )}
            </h2>
            {selectedSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No slots for this day. Use the Add Slot form to create one.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={cn(
                      "flex items-center justify-between rounded-2xl px-4 py-3 gap-3",
                      slot.is_blocked
                        ? "bg-muted"
                        : "bg-[var(--card-tint-mint)]",
                    )}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium">
                        {formatTime(slot.start_time)} –{" "}
                        {formatTime(slot.end_time)}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          slot.is_blocked
                            ? "text-amber-600"
                            : "text-emerald-600",
                        )}
                      >
                        {slot.is_blocked ? "Blocked" : "Available"}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        disabled={toggleLoading === slot.id}
                        onClick={() => handleToggleBlock(slot)}
                        className={cn(
                          "h-8 px-3 rounded-full text-xs font-medium border transition-all disabled:opacity-50",
                          slot.is_blocked
                            ? "border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                            : "border-amber-400 text-amber-700 hover:bg-amber-50",
                        )}
                      >
                        {toggleLoading === slot.id
                          ? "…"
                          : slot.is_blocked
                            ? "Unblock"
                            : "Block"}
                      </button>
                      <button
                        type="button"
                        disabled={deleteLoading === slot.id}
                        onClick={() => handleDelete(slot.id)}
                        className="h-8 px-3 rounded-full text-xs font-medium border border-destructive/40 text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                      >
                        {deleteLoading === slot.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-3xl p-5 shadow-[var(--shadow-card)] flex items-center justify-center py-16 text-center">
            <p className="text-muted-foreground text-sm">
              Select a date on the calendar to view and manage its slots.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
