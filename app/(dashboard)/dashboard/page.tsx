import { BookingFilters } from "@/components/dashboard/BookingFilters";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { BookingStatus } from "@/lib/constants/booking";
import { BOOKING_STATUS } from "@/lib/constants/booking";
import { createClient } from "@/lib/supabase/server";
import type { BookingListItem } from "@/types";
import { ChevronRight, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard - Kish Auto Detailing",
};

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = status as BookingStatus | undefined;

  const supabase = await createClient();

  // Stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [pendingRes, confirmedRes, completedTodayRes, thisWeekRes] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", BOOKING_STATUS.PENDING),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", BOOKING_STATUS.CONFIRMED),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", BOOKING_STATUS.COMPLETED)
        .gte("completed_at", todayStart.toISOString()),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekStart.toISOString()),
    ]);

  const STATS_CARDS = [
    {
      label: "Pending",
      value: pendingRes.count ?? 0,
      tint: "bg-[var(--card-tint-peach)]",
    },
    {
      label: "Confirmed",
      value: confirmedRes.count ?? 0,
      tint: "bg-[var(--card-tint-mint)]",
    },
    {
      label: "Completed Today",
      value: completedTodayRes.count ?? 0,
      tint: "bg-[var(--card-tint-lavender)]",
    },
    {
      label: "This Week",
      value: thisWeekRes.count ?? 0,
      tint: "bg-card",
    },
  ];

  // Bookings list with slot join
  let bookingsQuery = supabase
    .from("bookings")
    .select(
      `id, reference_token, customer_name, city, status, created_at,
       booking_items(price_at_booking, service:services(name)),
       slot:availability_slots!slot_id(date, start_time)`,
    )
    .order("created_at", { ascending: false });

  if (activeStatus) {
    bookingsQuery = bookingsQuery.eq("status", activeStatus);
  }

  const { data: bookings } = await bookingsQuery;
  const bookingList = (bookings ?? []) as unknown as BookingListItem[];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold md:text-3xl">Bookings</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATS_CARDS.map(({ label, value, tint }) => (
          <div
            key={label}
            className={`${tint} rounded-3xl p-4 flex flex-col gap-1 shadow-[var(--shadow-card)]`}
          >
            <span className="text-3xl font-bold">{value}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <BookingFilters activeStatus={activeStatus} />

      {/* Bookings list */}
      {bookingList.length === 0 ? (
        <div className="bg-card rounded-3xl p-12 flex flex-col items-center gap-3 shadow-[var(--shadow-card)] text-center">
          <Inbox
            className="size-10 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <p className="text-muted-foreground text-sm">
            {activeStatus ? `No ${activeStatus} bookings.` : "No bookings yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {bookingList.map((booking) => {
            const serviceNames =
              booking.booking_items
                .map((item) => item.service?.name)
                .filter(Boolean)
                .join(", ") || "—";

            const slot = booking.slot;
            const slotLabel = slot
              ? `${new Date(slot.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${formatTime(slot.start_time)}`
              : "—";

            return (
              <Link
                key={booking.id}
                href={`/dashboard/bookings/${booking.id}`}
                className="bg-card rounded-2xl px-4 py-3 flex items-center gap-3 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">
                      {booking.customer_name}
                    </span>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {serviceNames}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {slotLabel} · {booking.city}
                  </p>
                </div>
                <ChevronRight
                  className="size-4 text-muted-foreground flex-shrink-0"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
