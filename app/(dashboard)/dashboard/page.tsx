import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - Kish Auto Detailing",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Bookings</h1>
      <p className="text-muted-foreground">
        Booking management table will be rendered here.
      </p>
    </div>
  );
}
