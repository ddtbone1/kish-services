"use client";

import {
  createServiceAction,
  updateServiceAction,
} from "@/app/(dashboard)/dashboard/services/actions";
import { cn } from "@/lib/utils";
import type { Service } from "@/types";
import { X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

interface ServiceModalProps {
  mode: "add" | "edit";
  service?: Service;
  onClose: () => void;
}

export function ServiceModal({ mode, service, onClose }: ServiceModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(service?.is_active ?? true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    formData.set("is_active", String(isActive));
    setError(null);

    startTransition(async () => {
      const result =
        mode === "add"
          ? await createServiceAction(formData)
          : await updateServiceAction(service!.id, formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "add" ? "Add service" : "Edit service"}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
        <div className="w-full max-w-lg bg-card rounded-3xl shadow-[var(--shadow-card)] p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {mode === "add" ? "Add Service" : "Edit Service"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="size-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3"
            >
              {error}
            </div>
          )}

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="service-name"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Name
              </label>
              <input
                id="service-name"
                name="name"
                type="text"
                required
                minLength={2}
                maxLength={100}
                defaultValue={service?.name}
                placeholder="Interior Detailing"
                className="h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="service-description"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Description
              </label>
              <textarea
                id="service-description"
                name="description"
                maxLength={1000}
                defaultValue={service?.description ?? ""}
                placeholder="Short customer-facing description..."
                rows={4}
                className="rounded-2xl px-4 py-3 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="service-price"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Price
                </label>
                <input
                  id="service-price"
                  name="price"
                  type="number"
                  required
                  min={0}
                  max={999999.99}
                  step="0.01"
                  defaultValue={service?.price}
                  className="h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="service-duration"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Minutes
                </label>
                <input
                  id="service-duration"
                  name="duration_minutes"
                  type="number"
                  required
                  min={15}
                  max={1440}
                  step={15}
                  defaultValue={service?.duration_minutes}
                  className="h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
              <span className="text-sm font-medium">Visible to customers</span>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((value) => !value)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
                  isActive ? "bg-accent" : "bg-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 rounded-full bg-white shadow-md transition-transform mt-0.5",
                    isActive ? "translate-x-5.5" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 h-11 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 h-11 rounded-full bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
