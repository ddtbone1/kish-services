// Feature: Availability
// Purpose: DB access layer for availability slots and weekly templates
// Added: 2026-05-21

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOOKING_STATUS } from "@/lib/constants/booking";
import type {
  CreateSlotInput,
  CreateTemplateInput,
  GenerateSlotsInput,
} from "@/lib/validations/availability";
import type {
  AvailabilitySlot,
  AvailabilityTemplate,
  PublicAvailabilitySlot,
} from "@/types";

const OCCUPYING_BOOKING_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ON_THE_WAY,
  BOOKING_STATUS.COMPLETED,
] as const;

function getManilaNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

function isFutureInManila(date: string, startTime: string): boolean {
  const now = getManilaNow();
  if (date > now.date) return true;
  if (date < now.date) return false;

  const [hours = 0, minutes = 0] = startTime.split(":").map(Number);
  return hours * 60 + minutes > now.minutes;
}

export async function getSlotsByDateRange(
  from: string,
  to: string,
): Promise<{ data: AvailabilitySlot[] | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("availability_slots")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data: data as AvailabilitySlot[], error: null };
}

/**
 * Returns slots that are publicly bookable for a date: not blocked, still in
 * the future (Asia/Manila), and not already held by an active booking.
 *
 * Backed by the get_available_slots() Postgres function so reserved slots are
 * excluded in a single set-based query (no client-side join against bookings,
 * which anon cannot read under RLS).
 *
 * @since 2026-05-21 (reserved-slot exclusion added 2026-06-24)
 */
export async function getAvailableSlots(
  date: string,
): Promise<{ data: AvailabilitySlot[] | null; error: string | null }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("get_available_slots", {
    p_date: date,
  });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as AvailabilitySlot[], error: null };
}

/**
 * Returns every public slot for a date with a safe availability status. This
 * powers the live picker: booked/blocked/past slots stay visible but disabled,
 * while customer and booking details remain private.
 */
export async function getPublicAvailabilitySlots(
  date: string,
): Promise<{ data: PublicAvailabilitySlot[] | null; error: string | null }> {
  const supabase = createAdminClient();

  const { data: slots, error: slotsError } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("date", date)
    .order("start_time", { ascending: true });

  if (slotsError) return { data: null, error: slotsError.message };

  const safeSlots = (slots ?? []) as AvailabilitySlot[];
  if (safeSlots.length === 0) return { data: [], error: null };

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("slot_id")
    .in(
      "slot_id",
      safeSlots.map((slot) => slot.id),
    )
    .in("status", OCCUPYING_BOOKING_STATUSES);

  if (bookingsError) return { data: null, error: bookingsError.message };

  const bookedSlotIds = new Set(
    (bookings ?? []).map((booking) => booking.slot_id as string),
  );

  return {
    data: safeSlots.map((slot) => {
      if (slot.is_blocked) {
        return {
          ...slot,
          availability_status: "blocked",
          availability_label: "Unavailable",
          is_available: false,
        };
      }

      if (!isFutureInManila(slot.date, slot.start_time)) {
        return {
          ...slot,
          availability_status: "past",
          availability_label: "Passed",
          is_available: false,
        };
      }

      if (bookedSlotIds.has(slot.id)) {
        return {
          ...slot,
          availability_status: "booked",
          availability_label: "Booked",
          is_available: false,
        };
      }

      return {
        ...slot,
        availability_status: "available",
        availability_label: "Available",
        is_available: true,
      };
    }),
    error: null,
  };
}

export async function getSlotDateById(
  id: string,
): Promise<{ data: string | null; error: string | null }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("availability_slots")
    .select("date")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data.date as string, error: null };
}

export async function createSlot(
  input: CreateSlotInput,
): Promise<{ data: AvailabilitySlot | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("availability_slots")
    .insert(input)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as AvailabilitySlot, error: null };
}

export async function updateSlotBlocked(
  id: string,
  isBlocked: boolean,
): Promise<{ data: AvailabilitySlot | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("availability_slots")
    .update({ is_blocked: isBlocked })
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as AvailabilitySlot, error: null };
}

// ─── Availability Templates ───────────────────────────────────────────────────

/**
 * Returns all availability templates ordered by day of week.
 *
 * @returns { data: AvailabilityTemplate[] | null, error: string | null }
 * @since 2026-05-22
 */
export async function getTemplates(): Promise<{
  data: AvailabilityTemplate[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("availability_templates")
    .select("*")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data as AvailabilityTemplate[], error: null };
}

/**
 * Creates a new weekly availability template.
 *
 * @param input - Validated template fields from createTemplateSchema
 * @returns { data: AvailabilityTemplate | null, error: string | null }
 * @since 2026-05-22
 */
export async function createTemplate(
  input: CreateTemplateInput,
): Promise<{ data: AvailabilityTemplate | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("availability_templates")
    .insert(input)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as AvailabilityTemplate, error: null };
}

/**
 * Deletes an availability template by ID.
 *
 * @param id - Template UUID
 * @returns { error: string | null }
 * @since 2026-05-22
 */
export async function deleteTemplate(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("availability_templates")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Calls the `generate_slots_from_templates` Postgres function to
 * bulk-create availability slots for a given date range based on
 * active weekly templates. Idempotent — safe to call multiple times.
 *
 * @param input - { from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
 * @returns { data: number | null, error: string | null } — number of inserted rows
 * @since 2026-05-22
 */
export async function generateSlotsFromTemplates(
  input: GenerateSlotsInput,
): Promise<{ data: number | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("generate_slots_from_templates", {
    p_from: input.from,
    p_to: input.to,
  });

  if (error) return { data: null, error: error.message };
  return { data: data as number, error: null };
}
