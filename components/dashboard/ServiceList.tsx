"use client";

import { setServiceActiveAction } from "@/app/(dashboard)/dashboard/services/actions";
import { cn } from "@/lib/utils";
import type { Service } from "@/types";
import {
  Clock,
  Edit2,
  Eye,
  EyeOff,
  PackagePlus,
  PhilippinePeso,
} from "lucide-react";
import { useState, useTransition } from "react";
import { ServiceModal } from "./ServiceModal";

interface ServiceListProps {
  services: Service[];
}

export function ServiceList({ services }: ServiceListProps) {
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggleActive(service: Service) {
    setError(null);
    setUpdatingId(service.id);

    startTransition(async () => {
      const result = await setServiceActiveAction(
        service.id,
        !service.is_active,
      );
      if (result.error) setError(result.error);
      setUpdatingId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {services.length} service{services.length === 1 ? "" : "s"} configured
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <PackagePlus className="size-4" />
          Add Service
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="size-14 rounded-2xl bg-secondary flex items-center justify-center">
            <PackagePlus
              className="size-7 text-muted-foreground"
              strokeWidth={1.5}
            />
          </div>
          <div>
            <p className="font-semibold text-foreground">No services yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add the first customer-facing service package.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Add your first service
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              isUpdating={updatingId === service.id}
              onEdit={() => setEditingService(service)}
              onToggleActive={() => toggleActive(service)}
            />
          ))}
        </div>
      )}

      {isAddOpen && (
        <ServiceModal mode="add" onClose={() => setIsAddOpen(false)} />
      )}
      {editingService && (
        <ServiceModal
          mode="edit"
          service={editingService}
          onClose={() => setEditingService(null)}
        />
      )}
    </div>
  );
}

function ServiceCard({
  service,
  isUpdating,
  onEdit,
  onToggleActive,
}: {
  service: Service;
  isUpdating: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  return (
    <article
      className={cn(
        "bg-card rounded-3xl p-5 shadow-[var(--shadow-card)] transition-opacity",
        isUpdating && "opacity-50 pointer-events-none",
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-foreground leading-snug">
              {service.name}
            </h2>
            <span
              className={cn(
                "text-[11px] font-semibold px-2.5 py-0.5 rounded-full",
                service.is_active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {service.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          {service.description && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
              {service.description}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <PhilippinePeso className="size-4 text-muted-foreground" />
              {service.price.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <Clock className="size-4 text-muted-foreground" />
              {service.duration_minutes} min
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            <Edit2 className="size-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={onToggleActive}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            {service.is_active ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
            {service.is_active ? "Archive" : "Restore"}
          </button>
        </div>
      </div>
    </article>
  );
}
