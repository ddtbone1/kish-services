import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Booking - Kish Auto Detailing",
};

export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="flex flex-col items-center px-4 py-8 md:py-16">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold md:text-3xl">Your Booking</h1>
        <p className="text-muted-foreground">
          Booking details for reference: {token}
        </p>
        {/* Booking status, reschedule/cancel controls will be rendered here */}
      </div>
    </main>
  );
}
