import { getBookingByToken } from "@/lib/services/booking.service";
import { createClient } from "@/lib/supabase/server";
import { formatTime } from "@/lib/utils/datetime";
import type { AvailabilitySlot } from "@/types";
import { ArrowRight, CheckCircle2, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Booking Confirmed - Kish Auto Detailing",
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

const WHATS_NEXT = [
  { n: 1, text: "We'll confirm your booking within 2 hours." },
  { n: 2, text: "You'll receive a confirmation email with your details." },
  { n: 3, text: "Our team comes to your location — just relax!" },
];

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="flex flex-col items-center px-4 pt-24 md:pt-28 py-8 md:py-16">
        <div className="w-full max-w-md bg-card rounded-3xl p-8 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-bold mb-3">Invalid Link</h1>
          <p className="text-muted-foreground text-sm mb-6">
            This confirmation link is invalid or has expired.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const { data: booking } = await getBookingByToken(token);
  const slot = booking ? await getSlot(booking.slot_id) : null;

  const total = booking
    ? booking.booking_items.reduce((sum, i) => sum + i.price_at_booking, 0)
    : 0;

  return (
    <main className="flex flex-col items-center px-4 pt-24 md:pt-28 py-8 md:py-16">
      <div className="w-full max-w-lg flex flex-col gap-6">
        {/* Success card */}
        <div className="bg-[var(--card-tint-mint)] rounded-3xl p-8 flex flex-col items-center text-center gap-4">
          <CheckCircle2
            className="size-16 text-accent"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <div>
            <h1 className="text-2xl font-bold">Booking Received!</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Thank you
              {booking ? `, ${booking.customer_name.split(" ")[0]}` : ""}! We
              will be in touch soon.
            </p>
          </div>
          {booking && (
            <div className="bg-white/60 rounded-2xl px-4 py-2">
              <p className="text-xs text-muted-foreground mb-0.5">Reference</p>
              <code className="font-mono text-sm font-bold tracking-widest">
                {booking.reference_token.split("-")[0].toUpperCase()}
              </code>
            </div>
          )}
        </div>

        {/* What's next */}
        <div className="bg-card rounded-3xl p-6 shadow-[var(--shadow-card)]">
          <h2 className="font-semibold text-base mb-4">What happens next?</h2>
          <div className="flex flex-col gap-4">
            {WHATS_NEXT.map(({ n, text }) => (
              <div key={n} className="flex items-start gap-3">
                <div className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                  {n}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Booking summary */}
        {booking && (
          <div className="bg-card rounded-3xl p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-semibold text-base mb-4">Booking Summary</h2>
            <div className="flex flex-col gap-3">
              {/* Services */}
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
                  <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-border">
                    <span>Total</span>
                    <span>₱{total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Date/time */}
              {slot && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1 border-t border-border">
                  <span>
                    {new Date(slot.date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      { weekday: "long", month: "long", day: "numeric" },
                    )}{" "}
                    at {formatTime(slot.start_time)}
                  </span>
                </div>
              )}

              {/* Address */}
              <div className="flex items-start gap-2 text-sm text-muted-foreground pt-1 border-t border-border">
                <MapPin className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  {booking.address_line1}
                  {booking.address_line2
                    ? `, ${booking.address_line2}`
                    : ""}, {booking.city}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* CTA row */}
        <div className="flex flex-wrap gap-3 justify-center">
          {booking && (
            <Link
              href={`/booking/${booking.reference_token}`}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-border font-semibold text-sm hover:bg-muted transition-colors"
            >
              View Booking Status
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center justify-center h-11 px-5 rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
