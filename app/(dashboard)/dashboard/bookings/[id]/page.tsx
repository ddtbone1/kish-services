import { BookingStatusActions } from "@/components/dashboard/BookingStatusActions";
import { OwnerNotesForm } from "@/components/dashboard/OwnerNotesForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { BookingStatus } from "@/lib/constants/booking";
import { createClient } from "@/lib/supabase/server";
import type { OwnerBookingDetail } from "@/types";
import { ArrowLeft, Clock, ExternalLink, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Booking Details - Kish Auto Detailing",
};

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatTs(ts: string | null): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, reference_token, customer_name, customer_email, customer_phone,
       address_line1, address_line2, city, notes, owner_notes, status,
       completed_at, cancelled_at, declined_at, created_at, updated_at, slot_id,
       booking_items(id, price_at_booking, service:services(id, name, duration_minutes)),
       booking_add_ons(id, price_at_booking, add_on:add_ons(id, name)),
       slot:availability_slots!slot_id(id, date, start_time, end_time)`,
    )
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  const booking = data as unknown as OwnerBookingDetail & {
    slot: {
      id: string;
      date: string;
      start_time: string;
      end_time: string;
    } | null;
    customer_email: string;
    customer_phone: string | null;
  };

  const total =
    booking.booking_items.reduce((sum, i) => sum + i.price_at_booking, 0) +
    booking.booking_add_ons.reduce((sum, a) => sum + a.price_at_booking, 0);

  const mapsLink = `https://maps.google.com/?q=${encodeURIComponent(
    `${booking.address_line1}, ${booking.city}`,
  )}`;

  const TIMELINE_EVENTS = [
    { label: "Booked", ts: booking.created_at, always: true },
    { label: "Completed", ts: booking.completed_at, always: false },
    { label: "Cancelled", ts: booking.cancelled_at, always: false },
    { label: "Declined", ts: booking.declined_at, always: false },
  ].filter((e) => e.always || e.ts);

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="size-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Back to bookings"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">
              {booking.customer_name}
            </h1>
            <StatusBadge status={booking.status as BookingStatus} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ref:{" "}
            <code className="font-mono">
              {booking.reference_token.split("-")[0].toUpperCase()}
            </code>
          </p>
        </div>
      </div>

      {/* Status action card */}
      <BookingStatusActions
        bookingId={booking.id}
        currentStatus={booking.status as BookingStatus}
      />

      {/* Services & pricing */}
      <div className="bg-card rounded-3xl p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-semibold text-base mb-4">Services &amp; Pricing</h2>
        <div className="flex flex-col gap-1.5">
          {booking.booking_items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.service?.name ?? "Service"}</span>
              <span className="font-medium">
                ₱{item.price_at_booking.toFixed(2)}
              </span>
            </div>
          ))}
          {booking.booking_add_ons.map((addon) => (
            <div key={addon.id} className="flex justify-between text-sm">
              <span>{addon.add_on?.name ?? "Add-on"}</span>
              <span className="font-medium">
                ₱{addon.price_at_booking.toFixed(2)}
              </span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold pt-2 border-t border-border">
            <span>Total</span>
            <span>₱{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Date/time */}
        {booking.slot && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-3 border-t border-border mt-3">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            <span>
              {new Date(booking.slot.date + "T00:00:00").toLocaleDateString(
                "en-US",
                {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                },
              )}{" "}
              at {formatTime(booking.slot.start_time)}
            </span>
          </div>
        )}

        {/* Contact */}
        <div className="flex flex-col gap-1 text-sm text-muted-foreground pt-3 border-t border-border mt-3">
          <span>{booking.customer_email}</span>
          {booking.customer_phone && <span>{booking.customer_phone}</span>}
        </div>
      </div>

      {/* Address */}
      <div className="bg-card rounded-3xl p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-semibold text-base mb-3">Address</h2>
        <div className="flex items-start gap-2">
          <MapPin
            className="size-4 text-muted-foreground mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="text-sm">
              {booking.address_line1}
              {booking.address_line2 ? `, ${booking.address_line2}` : ""}
            </p>
            <p className="text-sm text-muted-foreground">{booking.city}</p>
          </div>
        </div>
        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-4 h-10 px-5 rounded-full bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          Open in Maps
        </a>
      </div>

      {/* Customer notes */}
      {booking.notes && (
        <div className="bg-card rounded-3xl p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-semibold text-base mb-2">Customer Notes</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {booking.notes}
          </p>
        </div>
      )}

      {/* Owner notes — private */}
      <OwnerNotesForm
        bookingId={booking.id}
        initialNotes={booking.owner_notes}
      />

      {/* Timeline */}
      {TIMELINE_EVENTS.length > 1 && (
        <div className="bg-card rounded-3xl p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-semibold text-base mb-4">Timeline</h2>
          <div className="flex flex-col gap-3">
            {TIMELINE_EVENTS.map(({ label, ts }) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <div className="size-2 rounded-full bg-primary flex-shrink-0" />
                <span className="font-medium w-24">{label}</span>
                <span className="text-muted-foreground">
                  {formatTs(ts as string)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
