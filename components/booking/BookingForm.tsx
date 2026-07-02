// Feature: Booking
// Purpose: Multi-step booking form — service selection, date/time, customer details
// Added: 2026-05-21

"use client";

import { BookingDatePicker } from "@/components/booking/BookingDatePicker";
import {
  SERVICE_AREA_OPTIONS,
  SERVICE_AREA_STATUS,
  getServiceArea,
} from "@/lib/constants/service-area";
import { SITE_REQUIREMENTS } from "@/lib/constants/policy";
import {
  normalizePhilippineMobile,
  VEHICLE_TYPES,
  type VehicleType,
} from "@/lib/validations/booking";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils/datetime";
import type { PublicAvailabilitySlot, Service } from "@/types";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface BookingFormProps {
  services: Service[];
  preselectedServiceId?: string;
}

const CARD_TINTS = [
  "bg-[var(--card-tint-mint)]",
  "bg-[var(--card-tint-peach)]",
  "bg-[var(--card-tint-lavender)]",
];

const PROGRESS_LABELS = ["Service", "Date & Time", "Your Details"];

const VEHICLE_LABELS: Record<VehicleType, string> = {
  sedan: "Sedan",
  suv: "SUV",
  pickup: "Pickup",
  van: "Van",
  motorcycle: "Motorcycle",
  other: "Other",
};

interface BookingFormState {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  notes: string;
  vehicle_details: string;
  access_instructions: string;
  site_safety_notes: string;
}

type Choice = { label: string; value: boolean | null };
type FormField = keyof BookingFormState;
type ValidationField =
  | FormField
  | "vehicle_type"
  | "parking_available"
  | "accept_terms_privacy"
  | "environmental_acknowledgement";
type FieldErrors = Partial<Record<ValidationField, string>>;
type TouchedFields = Partial<Record<ValidationField, boolean>>;

const YES_NO: Choice[] = [
  { label: "Yes", value: true },
  { label: "No", value: false },
];
const YES_NO_UNSURE: Choice[] = [...YES_NO, { label: "Not sure", value: null }];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PH_MOBILE_PATTERN = /^\+639\d{9}$/;

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-destructive">{children}</p>;
}

function validateDetails({
  form,
  vehicleType,
  parkingAvailable,
  acceptTermsPrivacy,
  environmentalAcknowledgement,
}: {
  form: BookingFormState;
  vehicleType: VehicleType | "";
  parkingAvailable: boolean | null;
  acceptTermsPrivacy: boolean;
  environmentalAcknowledgement: boolean;
}): FieldErrors {
  const errors: FieldErrors = {};
  const name = form.customer_name.trim();
  const email = form.customer_email.trim();
  const phone = form.customer_phone.trim();
  const normalizedPhone = phone ? normalizePhilippineMobile(phone) : "";

  if (name.length < 2) {
    errors.customer_name = "Enter your full name.";
  } else if (/\d/.test(name)) {
    errors.customer_name = "Full name cannot contain numbers.";
  } else if (/https?:\/\/|www\.|@/.test(name.toLowerCase())) {
    errors.customer_name = "Enter a real customer name.";
  }

  if (!EMAIL_PATTERN.test(email)) {
    errors.customer_email = "Enter a valid email address.";
  }

  if (!phone) {
    errors.customer_phone = "Phone number is required.";
  } else if (!PH_MOBILE_PATTERN.test(normalizedPhone)) {
    errors.customer_phone = "Use a Philippine mobile number, e.g. 0917 123 4567.";
  }

  if (form.address_line1.trim().length < 3) {
    errors.address_line1 = "Enter the service address.";
  }

  if (form.address_line2.length > 200) {
    errors.address_line2 = "Keep this under 200 characters.";
  }

  if (!getServiceArea(form.city)) {
    errors.city = "Choose a city or municipality in our service area.";
  }

  if (!vehicleType) {
    errors.vehicle_type = "Choose your vehicle type.";
  }

  if (vehicleType === "other" && !form.vehicle_details.trim()) {
    errors.vehicle_details = "Describe your vehicle.";
  } else if (form.vehicle_details.length > 200) {
    errors.vehicle_details = "Keep this under 200 characters.";
  }

  if (parkingAvailable === null) {
    errors.parking_available = "Tell us if there is a safe place to park and work.";
  }

  if (form.access_instructions.length > 500) {
    errors.access_instructions = "Keep this under 500 characters.";
  }

  if (form.site_safety_notes.length > 500) {
    errors.site_safety_notes = "Keep this under 500 characters.";
  }

  if (form.notes.length > 500) {
    errors.notes = "Keep notes under 500 characters.";
  }

  if (!acceptTermsPrivacy) {
    errors.accept_terms_privacy = "Accept the Terms and Privacy Notice to book.";
  }

  if (!environmentalAcknowledgement) {
    errors.environmental_acknowledgement =
      "Acknowledge the site and runoff requirements to book.";
  }

  return errors;
}

function getServerFieldErrors(details: unknown): FieldErrors {
  if (
    !details ||
    typeof details !== "object" ||
    !("fieldErrors" in details) ||
    !details.fieldErrors ||
    typeof details.fieldErrors !== "object"
  ) {
    return {};
  }

  const fieldErrors = details.fieldErrors as Record<string, unknown>;
  const errors: FieldErrors = {};

  for (const [key, value] of Object.entries(fieldErrors)) {
    if (!Array.isArray(value) || typeof value[0] !== "string") continue;
    errors[key as ValidationField] = value[0];
  }

  return errors;
}

/** Pill button group for a boolean / tri-state on-site question. */
function ChoiceGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  options: Choice[];
}) {
  return (
    <div>
      <p className="block text-xs font-medium mb-1">{label}</p>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-10 px-4 rounded-full text-sm font-medium border transition-all",
              value === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary border-border hover:bg-muted",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BookingForm({
  services,
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

  // Default to today in YYYY-MM-DD format (local time)
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const selectedSlotIdRef = useRef(selectedSlotId);
  const slotRequestIdRef = useRef(0);
  const [slots, setSlots] = useState<PublicAvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [availabilityNotice, setAvailabilityNotice] = useState<string | null>(
    null,
  );

  const [form, setForm] = useState<BookingFormState>({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    notes: "",
    vehicle_details: "",
    access_instructions: "",
    site_safety_notes: "",
  });
  // On-site safety (Phase 3) — kept separate from the string `form` map.
  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [parkingAvailable, setParkingAvailable] = useState<boolean | null>(null);
  const [waterAvailable, setWaterAvailable] = useState<boolean | null>(null);
  const [electricAvailable, setElectricAvailable] = useState<boolean | null>(
    null,
  );
  // Consent (Phase 2) — single combined acceptance; versions stamped server-side.
  const [acceptTermsPrivacy, setAcceptTermsPrivacy] = useState(false);
  const [environmentalAcknowledgement, setEnvironmentalAcknowledgement] =
    useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({});
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    selectedSlotIdRef.current = selectedSlotId;
  }, [selectedSlotId]);

  const loadSlots = useCallback(
    async ({
      clearSelection = false,
      silent = false,
    }: {
      clearSelection?: boolean;
      silent?: boolean;
    } = {}) => {
      const requestId = ++slotRequestIdRef.current;
      if (!silent) {
        setSlotsLoading(true);
        setSlotsError(null);
      }

      try {
        const res = await fetch(
          `/api/availability?date=${selectedDate}&t=${Date.now()}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? "Failed to load availability.");
        }

        if (requestId !== slotRequestIdRef.current) {
          return [] as PublicAvailabilitySlot[];
        }

        const nextSlots = (json.data ?? []) as PublicAvailabilitySlot[];
        setSlots(nextSlots);

        if (clearSelection) {
          selectedSlotIdRef.current = "";
          setSelectedSlotId("");
          setAvailabilityNotice(null);
        } else {
          const selectedId = selectedSlotIdRef.current;
          const selectedStillAvailable =
            !selectedId ||
            nextSlots.some(
              (slot) => slot.id === selectedId && slot.is_available,
            );

          if (!selectedStillAvailable) {
            selectedSlotIdRef.current = "";
            setSelectedSlotId("");
            setAvailabilityNotice(
              "That time was just booked. Please choose another available slot.",
            );
          }
        }

        return nextSlots;
      } catch (err) {
        if (requestId === slotRequestIdRef.current && !silent) {
          setSlots([]);
          setSlotsError(
            err instanceof Error
              ? err.message
              : "Failed to load availability.",
          );
        }
        return [] as PublicAvailabilitySlot[];
      } finally {
        if (requestId === slotRequestIdRef.current && !silent) {
          setSlotsLoading(false);
        }
      }
    },
    [selectedDate],
  );

  useEffect(() => {
    if (step !== 2 || !selectedDate) return;

    const initialLoad = window.setTimeout(() => {
      void loadSlots({ clearSelection: true });
    }, 0);

    const interval = window.setInterval(() => {
      void loadSlots({ silent: true });
    }, 15000);

    const refetchWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadSlots({ silent: true });
      }
    };

    window.addEventListener("focus", refetchWhenVisible);
    document.addEventListener("visibilitychange", refetchWhenVisible);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener("focus", refetchWhenVisible);
      document.removeEventListener("visibilitychange", refetchWhenVisible);
    };
  }, [loadSlots, selectedDate, step]);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function markTouched(key: ValidationField) {
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
  }

  function clearServerFieldError(key: ValidationField) {
    setServerFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function setField(key: FormField, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    markTouched(key);
    clearServerFieldError(key);
  }

  const selectedServiceArea = form.city ? getServiceArea(form.city) : undefined;
  const selectedServices = services.filter((s) =>
    selectedServiceIds.includes(s.id),
  );
  const total = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const selectedSlot = slots.find((sl) => sl.id === selectedSlotId);
  const canProceedStep1 = selectedServiceIds.length > 0;
  const canProceedStep2 = !!selectedSlotId && selectedSlot?.is_available;
  const clientFieldErrors = validateDetails({
    form,
    vehicleType,
    parkingAvailable,
    acceptTermsPrivacy,
    environmentalAcknowledgement,
  });
  const allFieldErrors = { ...serverFieldErrors, ...clientFieldErrors };
  const canSubmit = Object.keys(clientFieldErrors).length === 0;

  function getFieldError(field: ValidationField) {
    if (!submitAttempted && !touchedFields[field]) return undefined;
    return allFieldErrors[field];
  }

  function fieldClass(field: ValidationField, baseClassName: string) {
    return cn(
      baseClassName,
      getFieldError(field) &&
        "border-destructive focus:ring-destructive/40 bg-destructive/5",
    );
  }

  function setVehicleTypeValue(value: VehicleType | "") {
    setVehicleType(value);
    markTouched("vehicle_type");
    clearServerFieldError("vehicle_type");
    clearServerFieldError("vehicle_details");
  }

  function setParkingAvailableValue(value: boolean | null) {
    setParkingAvailable(value);
    markTouched("parking_available");
    clearServerFieldError("parking_available");
  }

  function setAcceptTermsPrivacyValue(value: boolean) {
    setAcceptTermsPrivacy(value);
    markTouched("accept_terms_privacy");
    clearServerFieldError("accept_terms_privacy");
  }

  function setEnvironmentalAcknowledgementValue(value: boolean) {
    setEnvironmentalAcknowledgement(value);
    markTouched("environmental_acknowledgement");
    clearServerFieldError("environmental_acknowledgement");
  }

  function selectSlot(slot: PublicAvailabilitySlot) {
    if (!slot.is_available) return;
    selectedSlotIdRef.current = slot.id;
    setSelectedSlotId(slot.id);
    setAvailabilityNotice(null);
  }

  async function handleContinueToDetails() {
    const selectedId = selectedSlotIdRef.current;
    if (!selectedId) return;

    const freshSlots = await loadSlots();
    const selectedStillAvailable = freshSlots.some(
      (slot) => slot.id === selectedId && slot.is_available,
    );

    if (selectedStillAvailable) {
      setStep(3);
    }
  }

  async function handleSubmit() {
    setSubmitAttempted(true);
    setSubmitting(true);
    setSubmitError(null);
    setServerFieldErrors({});

    if (Object.keys(clientFieldErrors).length > 0) {
      setSubmitError("Please fix the highlighted details before booking.");
      setSubmitting(false);
      return;
    }

    try {
      const selectedId = selectedSlotIdRef.current;
      const freshSlots = await loadSlots({ silent: true });
      const selectedStillAvailable = freshSlots.some(
        (slot) => slot.id === selectedId && slot.is_available,
      );

      if (!selectedStillAvailable) {
        setStep(2);
        setAvailabilityNotice(
          "That time was just booked. Please choose another available slot.",
        );
        return;
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: selectedId,
          service_ids: selectedServiceIds,
          customer_name: form.customer_name,
          customer_email: form.customer_email,
          ...(form.customer_phone && { customer_phone: form.customer_phone }),
          address_line1: form.address_line1,
          ...(form.address_line2 && { address_line2: form.address_line2 }),
          city: form.city,
          ...(form.notes && { notes: form.notes }),
          // Consent — server stamps the policy versions + timestamp.
          accept_terms_privacy: acceptTermsPrivacy,
          environmental_acknowledgement: environmentalAcknowledgement,
          // On-site safety. Omit tri-state fields left as "Not sure" so the
          // server stores NULL ("unknown").
          vehicle_type: vehicleType,
          ...(form.vehicle_details && { vehicle_details: form.vehicle_details }),
          parking_available: parkingAvailable,
          ...(waterAvailable !== null && { water_available: waterAvailable }),
          ...(electricAvailable !== null && {
            electric_available: electricAvailable,
          }),
          ...(form.access_instructions && {
            access_instructions: form.access_instructions,
          }),
          ...(form.site_safety_notes && {
            site_safety_notes: form.site_safety_notes,
          }),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setStep(2);
          setAvailabilityNotice(
            "That time was just booked. Please choose another available slot.",
          );
          void loadSlots({ silent: true });
        }
        if (json.details) {
          const nextServerErrors = getServerFieldErrors(json.details);
          setServerFieldErrors(nextServerErrors);
          if (Object.keys(nextServerErrors).length > 0) {
            setSubmitError("Please fix the highlighted details before booking.");
            return;
          }
        }
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
                  selectedSlotIdRef.current = "";
                  setSelectedSlotId("");
                  setAvailabilityNotice(null);
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
            ) : slotsError ? (
              <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3">
                {slotsError}
              </p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No slots are scheduled for this date. Please choose another day.
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
                      disabled={!slot.is_available}
                      onClick={() => selectSlot(slot)}
                      className={cn(
                        "flex flex-col items-center justify-center h-14 rounded-2xl text-xs font-medium border transition-all gap-0.5",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : !slot.is_available
                            ? "bg-secondary/70 border-border text-muted-foreground cursor-not-allowed"
                          : "bg-card border-border hover:bg-muted",
                      )}
                    >
                      <span className="font-semibold">
                        {formatTime(slot.start_time)}
                      </span>
                      <span className="opacity-60">
                        {slot.is_available ? durationLabel : slot.availability_label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {availabilityNotice && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mt-3">
                {availabilityNotice}
              </p>
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
              onClick={handleContinueToDetails}
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
                  onBlur={() => markTouched("customer_name")}
                  className={fieldClass(
                    "customer_name",
                    "w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring",
                  )}
                  placeholder="Jane Smith"
                />
                <ErrorText>{getFieldError("customer_name")}</ErrorText>
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
                  onBlur={() => markTouched("customer_email")}
                  className={fieldClass(
                    "customer_email",
                    "w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring",
                  )}
                  placeholder="jane@example.com"
                />
                <ErrorText>{getFieldError("customer_email")}</ErrorText>
              </div>

              <div>
                <label
                  htmlFor="customer_phone"
                  className="block text-xs font-medium mb-1"
                >
                  Phone *
                </label>
                <input
                  id="customer_phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.customer_phone}
                  onChange={(e) => setField("customer_phone", e.target.value)}
                  onBlur={() => markTouched("customer_phone")}
                  className={fieldClass(
                    "customer_phone",
                    "w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring",
                  )}
                  placeholder="0917 123 4567"
                />
                <ErrorText>{getFieldError("customer_phone")}</ErrorText>
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
                  onBlur={() => markTouched("address_line1")}
                  className={fieldClass(
                    "address_line1",
                    "w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring",
                  )}
                  placeholder="123 Main St"
                />
                <ErrorText>{getFieldError("address_line1")}</ErrorText>
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
                  onBlur={() => markTouched("address_line2")}
                  className={fieldClass(
                    "address_line2",
                    "w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring",
                  )}
                  placeholder="Apt 4B"
                />
                <ErrorText>{getFieldError("address_line2")}</ErrorText>
              </div>

              <div>
                <label
                  htmlFor="city"
                  className="block text-xs font-medium mb-1"
                >
                  City / Municipality *
                </label>
                <select
                  id="city"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  onBlur={() => markTouched("city")}
                  className={fieldClass(
                    "city",
                    "w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring",
                  )}
                >
                  <option value="" disabled>
                    Select service area...
                  </option>
                  {SERVICE_AREA_OPTIONS.map((area) => (
                    <option key={area.value} value={area.value}>
                      {area.label} - {area.province}
                    </option>
                  ))}
                </select>
                <ErrorText>{getFieldError("city")}</ErrorText>
                {selectedServiceArea?.status === SERVICE_AREA_STATUS.EXTENDED && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Extended area. The owner may confirm travel feasibility.
                  </p>
                )}
                {selectedServiceArea?.status ===
                  SERVICE_AREA_STATUS.MANUAL_REVIEW && (
                  <p className="text-xs text-muted-foreground mt-1">
                    This area needs owner review before confirmation.
                  </p>
                )}
              </div>

              {/* ── Vehicle & site readiness (Phase 3) ── */}
              <div>
                <label
                  htmlFor="vehicle_type"
                  className="block text-xs font-medium mb-1"
                >
                  Vehicle Type *
                </label>
                <select
                  id="vehicle_type"
                  value={vehicleType}
                  onChange={(e) =>
                    setVehicleTypeValue(e.target.value as VehicleType | "")
                  }
                  onBlur={() => markTouched("vehicle_type")}
                  className={fieldClass(
                    "vehicle_type",
                    "w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring",
                  )}
                >
                  <option value="" disabled>
                    Select vehicle type…
                  </option>
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {VEHICLE_LABELS[v]}
                    </option>
                  ))}
                </select>
                <ErrorText>{getFieldError("vehicle_type")}</ErrorText>
              </div>

              {vehicleType === "other" && (
                <div>
                  <label
                    htmlFor="vehicle_details"
                    className="block text-xs font-medium mb-1"
                  >
                    Describe your vehicle *
                  </label>
                  <input
                    id="vehicle_details"
                    type="text"
                    value={form.vehicle_details}
                    onChange={(e) => setField("vehicle_details", e.target.value)}
                    onBlur={() => markTouched("vehicle_details")}
                    className={fieldClass(
                      "vehicle_details",
                      "w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring",
                    )}
                    placeholder="e.g. box truck, tricycle"
                  />
                  <ErrorText>{getFieldError("vehicle_details")}</ErrorText>
                </div>
              )}

              <div>
                <ChoiceGroup
                  label="Safe place to park & work? *"
                  value={parkingAvailable}
                  onChange={setParkingAvailableValue}
                  options={YES_NO}
                />
                <ErrorText>{getFieldError("parking_available")}</ErrorText>
              </div>
              <ChoiceGroup
                label="Water access on-site?"
                value={waterAvailable}
                onChange={setWaterAvailable}
                options={YES_NO_UNSURE}
              />
              <ChoiceGroup
                label="Power outlet on-site?"
                value={electricAvailable}
                onChange={setElectricAvailable}
                options={YES_NO_UNSURE}
              />

              <div>
                <label
                  htmlFor="access_instructions"
                  className="block text-xs font-medium mb-1"
                >
                  Access Instructions
                </label>
                <input
                  id="access_instructions"
                  type="text"
                  value={form.access_instructions}
                  onChange={(e) =>
                    setField("access_instructions", e.target.value)
                  }
                  onBlur={() => markTouched("access_instructions")}
                  className={fieldClass(
                    "access_instructions",
                    "w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring",
                  )}
                  placeholder="Gate code, where to park, unit #"
                />
                <ErrorText>{getFieldError("access_instructions")}</ErrorText>
              </div>

              <div>
                <label
                  htmlFor="site_safety_notes"
                  className="block text-xs font-medium mb-1"
                >
                  Site Safety Notes
                </label>
                <input
                  id="site_safety_notes"
                  type="text"
                  value={form.site_safety_notes}
                  onChange={(e) => setField("site_safety_notes", e.target.value)}
                  onBlur={() => markTouched("site_safety_notes")}
                  className={fieldClass(
                    "site_safety_notes",
                    "w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring",
                  )}
                  placeholder="Pets, slope, hazards…"
                />
                <ErrorText>{getFieldError("site_safety_notes")}</ErrorText>
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
                  onBlur={() => markTouched("notes")}
                  className={fieldClass(
                    "notes",
                    "w-full rounded-2xl px-4 py-3 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none",
                  )}
                  placeholder="Any special instructions or access notes..."
                />
                <ErrorText>{getFieldError("notes")}</ErrorText>
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

          {/* ── Consent (Phase 2) ── */}
          <div className="flex flex-col gap-1">
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTermsPrivacy}
                onChange={(e) => setAcceptTermsPrivacyValue(e.target.checked)}
                onBlur={() => markTouched("accept_terms_privacy")}
                className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
              />
              <span className="text-foreground/80">
                I agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-accent hover:opacity-80"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-accent hover:opacity-80"
                >
                  Privacy Notice
                </a>
                , including the on-site safety and wastewater responsibilities.
              </span>
            </label>
            <p className="text-xs text-muted-foreground pl-7">
              We&apos;ll email you updates about this booking.
            </p>
            <div className="pl-7">
              <ErrorText>{getFieldError("accept_terms_privacy")}</ErrorText>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={environmentalAcknowledgement}
                onChange={(e) =>
                  setEnvironmentalAcknowledgementValue(e.target.checked)
                }
                onBlur={() => markTouched("environmental_acknowledgement")}
                className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
              />
              <span className="text-foreground/80">
                I confirm the work area is suitable for mobile detailing and
                understand that runoff or wastewater conditions must be disclosed.
              </span>
            </label>
            <p className="text-xs text-muted-foreground pl-7">
              {SITE_REQUIREMENTS.runoffResponsibility}
            </p>
            <div className="pl-7">
              <ErrorText>
                {getFieldError("environmental_acknowledgement")}
              </ErrorText>
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
