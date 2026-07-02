"use server";

import {
  createService,
  setServiceActive,
  updateService,
} from "@/lib/services/service.service";
import { createClient } from "@/lib/supabase/server";
import {
  createServiceSchema,
  updateServiceSchema,
} from "@/lib/validations/service";
import { revalidatePath, revalidateTag } from "next/cache";

function serviceInputFromFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    duration_minutes: formData.get("duration_minutes"),
    is_active: formData.get("is_active") === "true",
  };
}

async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

function revalidateServiceSurfaces() {
  revalidatePath("/");
  revalidatePath("/book");
  revalidatePath("/dashboard/services");
  revalidateTag("services", "max");
}

export async function createServiceAction(
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await requireOwner();
  if (!user) return { error: "Unauthorized" };

  const parsed = createServiceSchema.safeParse(serviceInputFromFormData(formData));
  if (!parsed.success) {
    return { error: "Invalid input. Check service name, price, and duration." };
  }

  const { error } = await createService(parsed.data);
  if (error) return { error };

  revalidateServiceSurfaces();
  return { error: null };
}

export async function updateServiceAction(
  id: string,
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await requireOwner();
  if (!user) return { error: "Unauthorized" };

  const parsed = updateServiceSchema.safeParse(serviceInputFromFormData(formData));
  if (!parsed.success) {
    return { error: "Invalid input. Check service name, price, and duration." };
  }

  const { error } = await updateService(id, parsed.data);
  if (error) return { error };

  revalidateServiceSurfaces();
  return { error: null };
}

export async function setServiceActiveAction(
  id: string,
  isActive: boolean,
): Promise<{ error: string | null }> {
  const user = await requireOwner();
  if (!user) return { error: "Unauthorized" };

  const { error } = await setServiceActive(id, isActive);
  if (error) return { error };

  revalidateServiceSurfaces();
  return { error: null };
}
