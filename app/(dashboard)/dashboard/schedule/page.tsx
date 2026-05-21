import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule Management - Kish Auto Detailing",
};

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Schedule</h1>
      <p className="text-muted-foreground">
        Availability slot management will be rendered here.
      </p>
    </div>
  );
}
