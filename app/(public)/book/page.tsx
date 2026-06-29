import { BookingForm } from "@/components/booking/BookingForm";
import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book an Appointment - Kish Auto Detailing",
  description: "Schedule your auto detailing service online.",
};

async function getServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });
  return (data as Service[]) ?? [];
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const [services, { service: preselectedServiceId }] = await Promise.all([
    getServices(),
    searchParams,
  ]);

  return (
    <main className="flex flex-col items-center px-4 pt-24 md:pt-28 py-8 md:py-16">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold md:text-3xl mb-8">
          Book an Appointment
        </h1>
        <BookingForm
          services={services}
          preselectedServiceId={preselectedServiceId}
        />
      </div>
    </main>
  );
}
