import { createClient } from "@/lib/supabase/server";
import type { CreateSlotInput } from "@/lib/validations/availability";
import type { AvailabilitySlot } from "@/types";

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
