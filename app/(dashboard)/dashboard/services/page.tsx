import { ServiceList } from "@/components/dashboard/ServiceList";
import { getAllServices } from "@/lib/services/service.service";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Service Management - Kish Auto Detailing",
};

export default async function ServiceManagementPage() {
  const { data: services } = await getAllServices();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Service Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage customer-facing services, prices, durations, and visibility.
        </p>
      </div>
      <ServiceList services={services ?? []} />
    </div>
  );
}
