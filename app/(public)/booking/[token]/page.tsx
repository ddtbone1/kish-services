import { BookingActions } from "@/components/booking/BookingActions";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { BookingStatus } from "@/lib/constants/booking";
import { BOOKING_STATUS } from "@/lib/constants/booking";
import { getBookingByToken } from "@/lib/services/booking.service";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { AvailabilitySlot } from "@/types";
import { Check, ExternalLink, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Your Booking - Kish Auto Detailing",
};

async function getSlot(slotId: string): Promise<AvailabilitySlot | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("id", slotId)
    .single();
  return (data as AvailabilitySlot) ?? null;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

const TIMELINE_STEPS: BookingStatus[] = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ON_THE_WAY,
  BOOKING_STATUS.COMPLETED,
];

const TIMELINE_LABELS: Record<BookingStatus, string> = {
  [BOOKING_STATUS.PENDING]: "Pending",
  [BOOKING_STATUS.CONFIRMED]: "Confirmed",
  [BOOKING_STATUS.ON_THE_WAY]: "On the Way",
  [BOOKING_STATUS.COMPLETED]: "Completed",
  [BOOKING_STATUS.CANCELLED]: "Cancelled",
  [BOOKING_STATUS.DECLINED]: "Declined",
};

export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { data: booking, error } = await getBookingByToken(token);

  if (error || !booking) {
    return (
      <main className="flex flex-col items-center px-4 py-8 md:py-16">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-3xl p-8 text-center shadow-[var(--shadow-card)]">
            <h1 className="text-xl font-bold mb-3">Booking Not Found</h1>
            <p className="text-muted-foreground text-sm mb-6">
              We couldn&apos;t find a booking with that reference. Double-check
              your confirmation email or contact us.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Contact Us
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center h-11 px-6 rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const slot = await getSlot(booking.slot_id);

  const isTerminal =
    booking.status === BOOKING_STATUS.CANCELLED ||
    booking.status === BOOKING_STATUS.DECLINED;

  const activeIndex = TIMELINE_STEPS.indexOf(booking.status);

  const total =
    booking.booking_items.reduce(
      (sum, item) => sum + item.price_at_booking,
      0,
    ) +
    booking.booking_add_ons.reduce(
      (sum, addon) => sum + addon.price_at_booking,
      0,
    );

  const mapsLink = `https://maps.google.com/?q=${encodeURIComponent(
    `${booking.address_line1}, ${booking.city}`,
  )}`;

  return (
    <main className="flex flex-col items-center px-4 py-8 md:py-16">
      <div className="w-full max-w-lg flex flex-col gap-6">
        {/* Status hero */}
        <div className="bg-card rounded-3xl p-6 shadow-[var(--shadow-card)] flex flex-col items-center gap-3 text-center">
          <StatusBadge
            status={booking.status}
            className="text-sm px-4 py-1.5"
          />
          <h1 className="text-xl font-bold">{booking.customer_name}</h1>
          <div className="bg-muted rounded-2xl px-4 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">Reference</p>
            <code className="font-mono text-sm font-bold tracking-widest">
              {booking.reference_token.split("-")[0].toUpperCase()}
            </code>
          </div>
        </div>

        {/* Progress timeline */}
        {!isTerminal ? (
          <div className="bg-card rounded-3xl p-6 shadow-[var(--shadow-card)]">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-5">
              Progress
            </p>
            <div className="flex items-start">
              {TIMELINE_STEPS.map((stepStatus, i) => {
                const isCompleted = activeIndex > i;
                const isActive = activeIndex === i;
                return (
                  <div
                    key={stepStatus}
                    className="flex items-center flex-1 last:flex-none"
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={cn(
                          "size-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                          isCompleted
                            ? "bg-primary border-primary text-primary-foreground"
                            : isActive
                              ? "bg-accent border-accent text-accent-foreground"
                              : "bg-background border-border text-muted-foreground",
                        )}
                      >
                        {isCompleted ? (
                          <Check className="size-3.5" aria-hidden="true" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium text-center leading-tight w-14",
                          isCompleted || isActive
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {TIMELINE_LABELS[stepStatus]}
                      </span>
                    </div>
                    {i < TIMELINE_STEPS.length - 1 && (
                      <div
                        className={cn(
                          "flex-1 h-0.5 mb-6",
                          isCompleted ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-3xl p-6 shadow-[var(--shadow-card)] text-center",
              booking.status === BOOKING_STATUS.CANCELLED
                ? "bg-muted"
                : "bg-red-50",
            )}
          >
            <p className="text-sm font-medium">
              This booking was{" "}
              <span className="font-bold">{booking.status}</span>.
              {booking.status === BOOKING_STATUS.DECLINED &&
                " Please contact us if you have any questions."}
            </p>
          </div>
        )}

        {/* Booking details */}
        <div className="bg-card rounded-3xl p-6 shadow-[var(--shadow-card)]">
          <h2 className="font-semibold text-base mb-4">Booking Details</h2>
          <div className="flex flex-col gap-3">
            {/* Services & add-ons */}
            {booking.booking_items.length > 0 && (
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
                <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-border">
                  <span>Total</span>
                  <span>₱{total.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Date/time */}
            {slot && (
              <div className="text-sm text-muted-foreground pt-2 border-t border-border">
                {new Date(slot.date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}{" "}
                at {formatTime(slot.start_time)}
              </div>
            )}

            {/* Address with Maps link */}
            <div className="flex items-start gap-2 pt-2 border-t border-border">
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
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent font-medium hover:opacity-80 transition-opacity shrink-0"
              >
                Maps
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        {/* Cancel / Reschedule actions */}
        <BookingActions
          token={booking.reference_token}
          status={booking.status}
        />

        <div className="flex justify-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
