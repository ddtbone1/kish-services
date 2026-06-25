import { BookingForm } from "@/components/booking/BookingForm";
import { createClient } from "@/lib/supabase/server";
import type { AddOn, Service } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book an Appointment - Kish Auto Detailing",
  description: "Schedule your auto detailing service online.",
};

async function getServicesAndAddOns(): Promise<{
  services: Service[];
  addOns: AddOn[];
}> {
  const supabase = await createClient();
  const [servicesResult, addOnsResult] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("add_ons")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);
  return {
    services: (servicesResult.data as Service[]) ?? [],
    addOns: (addOnsResult.data as AddOn[]) ?? [],
  };
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const [{ services, addOns }, { service: preselectedServiceId }] =
    await Promise.all([getServicesAndAddOns(), searchParams]);

  return (
    <main className="flex flex-col items-center px-4 pt-24 md:pt-28 py-8 md:py-16">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold md:text-3xl mb-8">
          Book an Appointment
        </h1>
        <BookingForm
          services={services}
          addOns={addOns}
          preselectedServiceId={preselectedServiceId}
        />
      </div>
    </main>
  );
}
