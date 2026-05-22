import { createClient } from "@/lib/supabase/server";
import type { CreateFaqInput, UpdateFaqInput } from "@/lib/validations/faq";
import type { FaqEntry } from "@/types";

export async function getActiveFaqs(): Promise<{
  data: FaqEntry[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("faq_entries")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data as FaqEntry[], error: null };
}

export async function createFaq(
  input: CreateFaqInput,
): Promise<{ data: FaqEntry | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("faq_entries")
    .insert({ ...input, is_active: true })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as FaqEntry, error: null };
}

export async function updateFaq(
  id: string,
  input: UpdateFaqInput,
): Promise<{ data: FaqEntry | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("faq_entries")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as FaqEntry, error: null };
}

export async function getAllFaqs(): Promise<{
  data: FaqEntry[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("faq_entries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data as FaqEntry[], error: null };
}

export async function deleteFaq(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.from("faq_entries").delete().eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}
