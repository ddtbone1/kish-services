import {
  BOOKING_TERMS_VERSION,
  CANCELLATION_POLICY,
  NO_SHOW_POLICY,
  RESCHEDULE_POLICY,
  SITE_REQUIREMENTS,
  WEATHER_POLICY,
} from "@/lib/constants/policy";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - Kish Auto Detailing",
  description:
    "Booking terms, cancellation policy, and on-site requirements for Kish Auto Detailing Services.",
};

export default function TermsPage() {
  return (
    <main className="px-4 md:px-16 pt-24 md:pt-28 py-12 md:py-20 max-w-4xl mx-auto w-full">
      <div className="mb-10">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Effective {BOOKING_TERMS_VERSION}
        </p>
        <h1 className="text-4xl md:text-6xl font-normal tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl">
          These terms apply when you book mobile auto detailing services with
          Kish Auto Detailing Services.
        </p>
      </div>

      <div className="space-y-8 text-sm leading-7 text-foreground/80">
        <PolicySection title="Bookings">
          <p>
            A submitted booking is a request for service. We may confirm,
            decline, cancel, or reschedule a booking when the requested time,
            location, weather, access, or site conditions make service
            impractical or unsafe.
          </p>
        </PolicySection>

        <PolicySection title="Cancellation and Rescheduling">
          <p>{CANCELLATION_POLICY.text}</p>
          <p>{RESCHEDULE_POLICY.text}</p>
          <p>{WEATHER_POLICY.text}</p>
          <p>{NO_SHOW_POLICY.text}</p>
        </PolicySection>

        <PolicySection title="Site Requirements">
          <ul className="list-disc pl-5 space-y-2">
            <li>{SITE_REQUIREMENTS.safeWorkArea}</li>
            <li>{SITE_REQUIREMENTS.waterAccess}</li>
            <li>{SITE_REQUIREMENTS.electricAccess}</li>
            <li>{SITE_REQUIREMENTS.runoffResponsibility}</li>
          </ul>
        </PolicySection>

        <PolicySection title="Customer Responsibilities">
          <p>
            You are responsible for providing accurate contact details, a
            serviceable address, vehicle access, and truthful site information.
            Please disclose restricted access, unsafe parking, water or
            electrical limitations, flooding, drainage concerns, or other site
            issues before the appointment.
          </p>
        </PolicySection>

        <PolicySection title="Transactional Email">
          <p>
            By booking, you agree to receive email-only transactional messages
            about your booking, including acknowledgement, confirmation,
            reminder, cancellation, decline, on-the-way, and completion updates.
          </p>
        </PolicySection>

        <PolicySection title="Contact">
          <p>
            For booking questions, contact us through{" "}
            <Link href="/chat" className="font-semibold text-accent">
              chat
            </Link>{" "}
            or email{" "}
            <a
              href="mailto:kishdetailing@gmail.com"
              className="font-semibold text-accent"
            >
              kishdetailing@gmail.com
            </a>
            .
          </p>
        </PolicySection>
      </div>
    </main>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="text-xl font-semibold text-foreground mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
