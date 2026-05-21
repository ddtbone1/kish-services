import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking Details - Kish Auto Detailing",
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Booking Details</h1>
      <p className="text-muted-foreground">Booking ID: {id}</p>
      {/* Booking detail view, status controls, Google Maps link, owner notes */}
    </div>
  );
}
