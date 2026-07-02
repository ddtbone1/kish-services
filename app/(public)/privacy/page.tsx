import { PRIVACY_NOTICE_VERSION } from "@/lib/constants/policy";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Notice - Kish Auto Detailing",
  description:
    "How Kish Auto Detailing Services uses booking and customer contact information.",
};

export default function PrivacyPage() {
  return (
    <main className="px-4 md:px-16 pt-24 md:pt-28 py-12 md:py-20 max-w-4xl mx-auto w-full">
      <div className="mb-10">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Effective {PRIVACY_NOTICE_VERSION}
        </p>
        <h1 className="text-4xl md:text-6xl font-normal tracking-tight">
          Privacy Notice
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl">
          This notice explains how we use information you provide when booking
          or contacting Kish Auto Detailing Services.
        </p>
      </div>

      <div className="space-y-8 text-sm leading-7 text-foreground/80">
        <PolicySection title="Information We Collect">
          <p>
            We collect the details needed to handle your booking: name, email,
            phone number, service address, selected services, appointment slot,
            vehicle and site-readiness details, booking notes, and chat
            questions you send through the website.
          </p>
        </PolicySection>

        <PolicySection title="How We Use Information">
          <p>
            We use your information to create and manage bookings, contact you
            about booking status, send email-only transactional updates,
            understand site requirements, improve customer support, and keep
            business records.
          </p>
        </PolicySection>

        <PolicySection title="Transactional Email">
          <p>
            Booking lifecycle emails are required service communications. We do
            not collect marketing consent or send promotional campaigns from
            this booking flow.
          </p>
        </PolicySection>

        <PolicySection title="Access and Retention">
          <p>
            Booking information is available to the business owner through the
            protected dashboard. We keep records as needed for scheduling,
            customer service, operational history, and legal or accounting
            obligations.
          </p>
        </PolicySection>

        <PolicySection title="Third-Party Services">
          <p>
            The website uses service providers such as Supabase for database and
            authentication, SMTP email delivery, and Google Gemini for the chat
            assistant. These providers process information only as needed to
            operate the service.
          </p>
        </PolicySection>

        <PolicySection title="Contact">
          <p>
            For privacy questions, contact us through{" "}
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
