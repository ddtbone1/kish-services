import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book an Appointment - Kish Auto Detailing",
  description: "Schedule your auto detailing service online.",
};

export default function BookPage() {
  return (
    <main className="flex flex-col items-center px-4 py-8 md:py-16">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold md:text-3xl">Book an Appointment</h1>
        <p className="text-muted-foreground">
          Booking form will be implemented here.
        </p>
      </div>
    </main>
  );
}
