import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking Confirmed - Kish Auto Detailing",
};

export default function ConfirmationPage() {
  return (
    <main className="flex flex-col items-center px-4 py-8 md:py-16">
      <div className="w-full max-w-2xl space-y-6 text-center">
        <h1 className="text-2xl font-bold md:text-3xl">Booking Received!</h1>
        <p className="text-muted-foreground">
          We&apos;ve sent a confirmation email with your booking reference.
          You&apos;ll be able to track your booking status there.
        </p>
      </div>
    </main>
  );
}
