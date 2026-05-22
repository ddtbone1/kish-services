// Feature: Booking
// Purpose: Branded month-view calendar date picker for the booking form
// Added: 2026-05-22

"use client";

import { cn } from "@/lib/utils";
import { format, startOfDay } from "date-fns";
import { DayPicker } from "react-day-picker";

// Maximum days into the future a customer can book
const MAX_FUTURE_DAYS = 90;

interface BookingDatePickerProps {
  /** Currently selected date in YYYY-MM-DD format */
  selected: string;
  /** Called with the new YYYY-MM-DD string when the user selects a date */
  onSelect: (date: string) => void;
}

/**
 * Month-view calendar using react-day-picker v10.
 * Disables past dates and limits selection to the next 90 days.
 * Styled to match the booking form design tokens.
 */
export function BookingDatePicker({
  selected,
  onSelect,
}: BookingDatePickerProps) {
  const today = startOfDay(new Date());
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + MAX_FUTURE_DAYS);

  // Convert YYYY-MM-DD → Date for DayPicker
  const selectedDate = selected ? new Date(`${selected}T00:00:00`) : undefined;

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    // Serialize back to YYYY-MM-DD (local time, no UTC shift)
    onSelect(format(date, "yyyy-MM-dd"));
  }

  return (
    <DayPicker
      mode="single"
      selected={selectedDate}
      onSelect={handleSelect}
      defaultMonth={selectedDate ?? today}
      disabled={[
        // Disable all past days
        { before: today },
        // Disable all days beyond MAX_FUTURE_DAYS
        { after: maxDate },
      ]}
      // ── Tailwind classNames ────────────────────────────────────────────────
      classNames={{
        root: "w-full",
        months: "flex flex-col",
        month_caption: "flex items-center justify-between px-1 pb-3",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "flex items-center gap-1",
        button_previous: cn(
          "size-8 rounded-full flex items-center justify-center",
          "text-muted-foreground hover:bg-muted hover:text-foreground",
          "transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
        ),
        button_next: cn(
          "size-8 rounded-full flex items-center justify-center",
          "text-muted-foreground hover:bg-muted hover:text-foreground",
          "transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
        ),
        chevron: "size-4 fill-current",
        month_grid: "w-full border-collapse",
        weekday:
          "text-xs font-medium text-muted-foreground text-center pb-2 w-10",
        day: "p-0 text-center",
        day_button: cn(
          "size-9 rounded-full text-sm font-medium transition-all w-full",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        ),
        today: "font-bold text-accent",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary/90",
        outside: "opacity-30 pointer-events-none",
        disabled: "opacity-25 cursor-not-allowed pointer-events-none",
        hidden: "invisible",
        range_start: "",
        range_middle: "",
        range_end: "",
        dropdowns: "",
        dropdown: "",
        dropdown_root: "",
        week_number: "",
      }}
    />
  );
}
