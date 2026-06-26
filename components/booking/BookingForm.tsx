// Feature: Booking
// Purpose: Multi-step booking form — service selection, date/time, customer details
// Added: 2026-05-21

"use client";

import { BookingDatePicker } from "@/components/booking/BookingDatePicker";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils/datetime";
import type { AddOn, AvailabilitySlot, Service } from "@/types";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface BookingFormProps {
  services: Service[];
  addOns: AddOn[];
  preselectedServiceId?: string;
}

const CARD_TINTS = [
  "bg-[var(--card-tint-mint)]",
  "bg-[var(--card-tint-peach)]",
  "bg-[var(--card-tint-lavender)]",
];

const PROGRESS_LABELS = ["Service", "Date & Time", "Your Details"];

export function BookingForm({
  services,
  addOns,
  preselectedServiceId,
}: BookingFormProps) {
  const router = useRouter();

  const [step, setStep] = useState(1);

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    if (
      preselectedServiceId &&
      services.some((s) => s.id === preselectedServiceId)
    ) {
      return [preselectedServiceId];
    }
    return [];
  });
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);

  // Default to today in YYYY-MM-DD format (local time)
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== 2 || !selectedDate) return;
    let cancelled = false;

    const timer = window.setTimeout(() => {
      setSlotsLoading(true);
      setSelectedSlotId("");
      fetch(`/api/availability?date=${selectedDate}`)
        .then((r) => r.json())
        .then((json) => {
          if (!cancelled) setSlots(json.data ?? []);
        })
        .catch(() => {
          if (!cancelled) setSlots([]);
        })
        .finally(() => {
          if (!cancelled) setSlotsLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [selectedDate, step]);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function toggleAddOn(id: string) {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canProceedStep1 = selectedServiceIds.length > 0;
  const canProceedStep2 = !!selectedSlotId;
  const canSubmit =
    form.customer_name.trim().length >= 2 &&
    form.customer_email.includes("@") &&
    form.address_line1.trim().length >= 3 &&
    form.city.trim().length >= 2;

  const selectedServices = services.filter((s) =>
    selectedServiceIds.includes(s.id),
  );
  const selectedAddOns = addOns.filter((a) => selectedAddOnIds.includes(a.id));
  const total =
    selectedServices.reduce((sum, s) => sum + s.price, 0) +
    selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  const selectedSlot = slots.find((sl) => sl.id === selectedSlotId);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: selectedSlotId,
          service_ids: selectedServiceIds,
          ...(selectedAddOnIds.length > 0 && { add_on_ids: selectedAddOnIds }),
          customer_name: form.customer_name,
          customer_email: form.customer_email,
          ...(form.customer_phone && { customer_phone: form.customer_phone }),
          address_line1: form.address_line1,
          ...(form.address_line2 && { address_line2: form.address_line2 }),
          city: form.city,
          ...(form.notes && { notes: form.notes }),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push(`/book/confirmation?token=${json.data.reference_token}`);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      {/* Progress indicator */}
      <div className="flex items-center gap-1 mb-8">
        {PROGRESS_LABELS.map((label, i) => {
          const n = i + 1;
          const isActive = step === n;
          const isDone = step > n;
          return (
            <div key={label} className="flex items-center gap-1 flex-1">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div
                  className={cn(
                    "size-7 rounded-full flex items-center justify-center text-xs font-bold",
                    isActive && "bg-primary text-primary-foreground",
                    isDone && "bg-accent text-accent-foreground",
                    !isActive && !isDone && "bg-muted text-muted-foreground",
                  )}
                >
                  {isDone ? <Check className="size-3.5" /> : n}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium hidden sm:block",
                    isActive || isDone
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </div>
              {i < PROGRESS_LABELS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px mx-1",
                    isDone ? "bg-accent" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Service selection ── */}
      {step === 1 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Choose your service</h2>
            <p className="text-sm text-muted-foreground">
              Select one or more packages.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((service, i) => {
              const isSelected = selectedServiceIds.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={cn(
                    "relative rounded-3xl p-4 flex flex-col gap-2 text-left transition-all border-2",
                    CARD_TINTS[i % 3],
                    isSelected
                      ? "border-primary shadow-[var(--shadow-card-hover)]"
                      : "border-transparent",
                  )}
                >
                  {isSelected && (
                    <span className="absolute top-3 right-3 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="size-3" />
                    </span>
                  )}
                  <div className="flex items-start gap-2 pr-6">
                    <h3 className="font-semibold text-sm leading-snug">
                      {service.name}
                    </h3>
                  </div>
                  {service.description && (
                    <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2">
                      {service.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-sm">
                      ₱{service.price.toFixed(2)}
                    </span>
                    <span className="text-xs bg-black/10 rounded-full px-2 py-0.5">
                      {service.duration_minutes} min
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Add-ons */}
          {addOns.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">
                Add-ons{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {addOns.map((addon) => {
                  const isSelected = selectedAddOnIds.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddOn(addon.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:bg-muted",
                      )}
                    >
                      {isSelected && <Check className="size-3" />}
                      {addon.name} · ₱{addon.price.toFixed(2)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!canProceedStep1}
            onClick={() => setStep(2)}
            className="w-full h-12 rounded-full bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            Continue to Date &amp; Time
          </button>
        </div>
      )}

      {/* ── Step 2: Date & Time ── */}
      {step === 2 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">
              Choose a date &amp; time
            </h2>
            <p className="text-sm text-muted-foreground">
              Select your preferred appointment slot.
            </p>
          </div>

          {/* Month calendar date picker */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Date
            </p>
            <div className="rounded-2xl border border-border bg-card p-3">
              <BookingDatePicker
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedSlotId("");
                }}
              />
            </div>
          </div>

          {/* Time slots */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Available Times
            </p>
            {slotsLoading ? (
              <div className="flex flex-wrap gap-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-9 w-20 rounded-full bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No available slots for this date. Please choose another day.
              </p>
            ) : (
              // 3-column grid with larger touch targets and duration display
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => {
                  const isSelected = selectedSlotId === slot.id;
                  // Calculate duration in hours/minutes for display
                  const [sh, sm] = slot.start_time.split(":").map(Number);
                  const [eh, em] = slot.end_time.split(":").map(Number);
                  const durationMins = eh * 60 + em - (sh * 60 + sm);
                  const durationLabel =
                    durationMins >= 60
                      ? durationMins % 60 === 0
                        ? `${durationMins / 60}hr`
                        : `${Math.floor(durationMins / 60)}hr ${durationMins % 60}m`
                      : `${durationMins}m`;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={cn(
                        "flex flex-col items-center justify-center h-14 rounded-2xl text-xs font-medium border transition-all gap-0.5",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:bg-muted",
                      )}
                    >
                      <span className="font-semibold">
                        {formatTime(slot.start_time)}
                      </span>
                      <span className="opacity-60">{durationLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 h-12 rounded-full border border-border font-semibold text-sm hover:bg-muted transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canProceedStep2}
              onClick={() => setStep(3)}
              className="flex-1 h-12 rounded-full bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue to Details
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Your Details ── */}
      {step === 3 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Your details</h2>
            <p className="text-sm text-muted-foreground">
              Tell us where to find you and how to get in touch.
            </p>
          </div>

          <div className="flex flex-col gap-6 md:flex-row">
            {/* Form fields */}
            <div className="flex flex-col gap-3 flex-1">
              <div>
                <label
                  htmlFor="customer_name"
                  className="block text-xs font-medium mb-1"
                >
                  Full Name *
                </label>
                <input
                  id="customer_name"
                  type="text"
                  autoComplete="name"
                  value={form.customer_name}
                  onChange={(e) => setField("customer_name", e.target.value)}
                  className="w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label
                  htmlFor="customer_email"
                  className="block text-xs font-medium mb-1"
                >
                  Email *
                </label>
                <input
                  id="customer_email"
                  type="email"
                  autoComplete="email"
                  value={form.customer_email}
                  onChange={(e) => setField("customer_email", e.target.value)}
                  className="w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="customer_phone"
                  className="block text-xs font-medium mb-1"
                >
                  Phone
                </label>
                <input
                  id="customer_phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.customer_phone}
                  onChange={(e) => setField("customer_phone", e.target.value)}
                  className="w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label
                  htmlFor="address_line1"
                  className="block text-xs font-medium mb-1"
                >
                  Address *
                </label>
                <input
                  id="address_line1"
                  type="text"
                  autoComplete="address-line1"
                  value={form.address_line1}
                  onChange={(e) => setField("address_line1", e.target.value)}
                  className="w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="123 Main St"
                />
              </div>

              <div>
                <label
                  htmlFor="address_line2"
                  className="block text-xs font-medium mb-1"
                >
                  Apt / Suite
                </label>
                <input
                  id="address_line2"
                  type="text"
                  autoComplete="address-line2"
                  value={form.address_line2}
                  onChange={(e) => setField("address_line2", e.target.value)}
                  className="w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Apt 4B"
                />
              </div>

              <div>
                <label
                  htmlFor="city"
                  className="block text-xs font-medium mb-1"
                >
                  City *
                </label>
                <input
                  id="city"
                  type="text"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  className="w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Los Angeles"
                />
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-xs font-medium mb-1"
                >
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  className="w-full rounded-2xl px-4 py-3 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Any special instructions or access notes..."
                />
              </div>
            </div>

            {/* Order summary — side on desktop, above submit on mobile (rendered after fields via order) */}
            <div className="md:w-56 flex-shrink-0 order-first md:order-last">
              <div className="rounded-3xl bg-[var(--card-tint-mint)] p-4 flex flex-col gap-3">
                <h3 className="font-semibold text-sm">Order Summary</h3>
                {selectedServices.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No services selected.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {selectedServices.map((s) => (
                      <div
                        key={s.id}
                        className="flex justify-between gap-2 text-xs"
                      >
                        <span className="text-foreground/80">{s.name}</span>
                        <span className="font-medium shrink-0">
                          ₱{s.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {selectedAddOns.map((a) => (
                      <div
                        key={a.id}
                        className="flex justify-between gap-2 text-xs"
                      >
                        <span className="text-foreground/80">{a.name}</span>
                        <span className="font-medium shrink-0">
                          ₱{a.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-black/10 pt-2 flex justify-between items-center">
                  <span className="text-xs font-semibold">Total</span>
                  <span className="font-bold text-base">
                    ₱{total.toFixed(2)}
                  </span>
                </div>
                {selectedSlot && (
                  <div className="border-t border-black/10 pt-2 text-xs text-foreground/70 flex flex-col gap-0.5">
                    <span>
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </span>
                    <span>{formatTime(selectedSlot.start_time)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {submitError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3">
              {submitError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 h-12 rounded-full border border-border font-semibold text-sm hover:bg-muted transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              className="flex-1 h-12 rounded-full bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Booking..." : "Confirm Booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
