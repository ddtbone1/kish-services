import { createClient } from "@/lib/supabase/server";
import type {
  CreateServiceInput,
  UpdateServiceInput,
} from "@/lib/validations/service";
import type { Service } from "@/types";

export async function getAllServices(): Promise<{
  data: Service[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Service[], error: null };
}

export async function getActiveServices(): Promise<{
  data: Service[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Service[], error: null };
}

export async function createService(
  input: CreateServiceInput,
): Promise<{ data: Service | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .insert(input)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Service, error: null };
}

export async function updateService(
  id: string,
  input: UpdateServiceInput,
): Promise<{ data: Service | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Service, error: null };
}

export async function setServiceActive(
  id: string,
  isActive: boolean,
): Promise<{ data: Service | null; error: string | null }> {
  return updateService(id, { is_active: isActive });
}
