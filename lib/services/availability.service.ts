// Feature: Availability
// Purpose: DB access layer for availability slots and weekly templates
// Added: 2026-05-21

import { createClient } from "@/lib/supabase/server";
import type {
  CreateSlotInput,
  CreateTemplateInput,
  GenerateSlotsInput,
} from "@/lib/validations/availability";
import type { AvailabilitySlot, AvailabilityTemplate } from "@/types";

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

export async function getAvailableSlots(
  date: string,
): Promise<{ data: AvailabilitySlot[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("date", date)
    .eq("is_blocked", false)
    .order("start_time", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data as AvailabilitySlot[], error: null };
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
