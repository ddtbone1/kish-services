// Feature: Dashboard
// Purpose: URL-driven search box for the bookings list (by customer name)
// Added: 2026-06-24

"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function BookingSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  function apply(next: string) {
    // Preserve the active status filter; reset pagination on a new search.
    const params = new URLSearchParams();
    const status = searchParams.get("status");
    if (status) params.set("status", status);
    const q = next.trim();
    if (q) params.set("q", q);
    const qs = params.toString();
    router.push(qs ? `/dashboard?${qs}` : "/dashboard");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    apply(value);
  }

  function clear() {
    setValue("");
    apply("");
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="relative">
      <label htmlFor="booking-search" className="sr-only">
        Search bookings by customer name
      </label>
      <Search
        className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id="booking-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by customer name…"
        className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-9 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </form>
  );
}
