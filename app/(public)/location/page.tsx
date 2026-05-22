// Feature: Location Page
// Purpose: Shop address, hours, map, contact, social links
// Added: 2026-05-22

import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Location - Kish Auto Detailing",
  description:
    "Find Kish Auto Detailing Services. View our address, business hours, and contact details.",
};

// ─── Business details ──────────────────────────────────────────────────────────
const BUSINESS = {
  address: {
    line1: "Agan Grandville Block 3 Lot 24",
    line2: "Brgy. City Heights",
    city: "General Santos City",
    province: "South Cotabato",
    postal: "9500",
  },
  phone: "+63 985 204 9882",
  email: "kishdetailing@gmail.com",
  mapsQuery:
    "Agan+Grandville+Block+3+Lot+24+Brgy+City+Heights+General+Santos+City+Philippines",
  hours: [
    { day: "Monday", hours: "8:00 AM – 6:00 PM" },
    { day: "Tuesday", hours: "8:00 AM – 6:00 PM" },
    { day: "Wednesday", hours: "8:00 AM – 6:00 PM" },
    { day: "Thursday", hours: "8:00 AM – 6:00 PM" },
    { day: "Friday", hours: "8:00 AM – 6:00 PM" },
    { day: "Saturday", hours: "8:00 AM – 4:00 PM" },
    { day: "Sunday", hours: "Closed" },
  ],
  socials: {
    facebook: "https://www.facebook.com/profile.php?id=61589002202595",
  },
};
// ─────────────────────────────────────────────────────────────────────────────

const mapsUrl = `https://maps.google.com/?q=${BUSINESS.mapsQuery}`;
const fullAddress = [
  BUSINESS.address.line1,
  BUSINESS.address.line2,
  BUSINESS.address.city,
  BUSINESS.address.province,
  BUSINESS.address.postal,
]
  .filter(Boolean)
  .join(", ");

export default function LocationPage() {
  return (
    <main className="px-4 md:px-16 py-12 md:py-20 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="size-2 rounded-full bg-accent" />
          <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Find Us
          </span>
        </div>
        <h1 className="text-4xl md:text-6xl font-normal tracking-tight">
          We Come to You
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
          Based locally and fully mobile — we bring the shine to your doorstep.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact card */}
        <div className="bg-card rounded-3xl p-6 flex flex-col gap-5 shadow-[var(--shadow-card)]">
          <h2 className="font-bold text-lg">Contact</h2>

          <div className="flex flex-col gap-4">
            {/* Address */}
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                <MapPin
                  className="size-4 text-muted-foreground"
                  strokeWidth={1.5}
                />
              </div>
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {BUSINESS.address.line1}
                </p>
                {BUSINESS.address.line2 && (
                  <p className="text-muted-foreground">
                    {BUSINESS.address.line2}
                  </p>
                )}
                <p className="text-muted-foreground">
                  {BUSINESS.address.city}, {BUSINESS.address.province}{" "}
                  {BUSINESS.address.postal}
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                <Phone
                  className="size-4 text-muted-foreground"
                  strokeWidth={1.5}
                />
              </div>
              <a
                href={`tel:${BUSINESS.phone.replace(/\D/g, "")}`}
                className="text-sm font-medium text-foreground hover:text-accent transition-colors"
              >
                {BUSINESS.phone}
              </a>
            </div>

            {/* Email */}
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                <Mail
                  className="size-4 text-muted-foreground"
                  strokeWidth={1.5}
                />
              </div>
              <a
                href={`mailto:${BUSINESS.email}`}
                className="text-sm font-medium text-foreground hover:text-accent transition-colors"
              >
                {BUSINESS.email}
              </a>
            </div>
          </div>

          {/* Social links */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Follow Us
            </p>
            <div className="flex gap-3">
              <a
                href={BUSINESS.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-4 rounded-full bg-secondary text-sm font-medium text-foreground hover:text-accent hover:bg-accent/10 transition-colors flex items-center"
              >
                Facebook
              </a>
            </div>
          </div>
        </div>

        {/* Hours card */}
        <div className="bg-card rounded-3xl p-6 flex flex-col gap-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg">Business Hours</h2>
            <Clock className="size-4 text-muted-foreground" strokeWidth={1.5} />
          </div>

          <div className="flex flex-col gap-2">
            {BUSINESS.hours.map(({ day, hours }) => (
              <div
                key={day}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <span className="text-sm font-medium text-foreground">
                  {day}
                </span>
                <span
                  className={
                    hours === "Closed"
                      ? "text-sm text-muted-foreground"
                      : "text-sm font-medium text-foreground"
                  }
                >
                  {hours}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map section */}
      <div className="mt-6 bg-card rounded-3xl overflow-hidden shadow-[var(--shadow-card)]">
        {process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL ? (
          <iframe
            src={process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL}
            className="w-full h-72 border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Kish Auto Detailing location"
          />
        ) : (
          <div className="h-72 bg-secondary flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <MapPin className="size-8 mx-auto" strokeWidth={1.5} />
              <p className="text-sm font-medium">{fullAddress}</p>
            </div>
          </div>
        )}
        <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">{fullAddress}</p>
          <Link
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <MapPin className="size-4" />
            Open in Google Maps
          </Link>
        </div>
      </div>

      {/* Book CTA */}
      <div className="mt-10 bg-accent rounded-3xl px-8 py-10 text-center flex flex-col items-center gap-6">
        <h2 className="text-2xl md:text-4xl font-normal text-white">
          Ready to book your detailing?
        </h2>
        <Link
          href="/book"
          className="inline-flex items-center justify-center h-13 px-10 rounded-full bg-white text-black font-semibold text-base hover:scale-105 transition-all shadow-xl"
        >
          Book Now
        </Link>
      </div>
    </main>
  );
}
