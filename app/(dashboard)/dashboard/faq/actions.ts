"use server";

import { createFaq, deleteFaq, updateFaq } from "@/lib/services/faq.service";
import { createFaqSchema, updateFaqSchema } from "@/lib/validations/faq";
import { revalidatePath } from "next/cache";

function tagsFromFormData(formData: FormData): string[] {
  const raw = formData.get("tags") as string | null;
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createFaqAction(
  formData: FormData,
): Promise<{ error: string | null }> {
  const input = {
    question: formData.get("question") as string,
    answer: formData.get("answer") as string,
    tags: tagsFromFormData(formData),
  };

  const parsed = createFaqSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid input. Check question and answer length." };
  }

  const { error } = await createFaq(parsed.data);
  if (error) return { error };

  revalidatePath("/dashboard/faq");
  return { error: null };
}

export async function updateFaqAction(
  id: string,
  formData: FormData,
): Promise<{ error: string | null }> {
  const input = {
    question: formData.get("question") as string,
    answer: formData.get("answer") as string,
    tags: tagsFromFormData(formData),
    is_active: formData.get("is_active") === "true",
  };

  const parsed = updateFaqSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid input. Check question and answer length." };
  }

  const { error } = await updateFaq(id, parsed.data);
  if (error) return { error };

  revalidatePath("/dashboard/faq");
  return { error: null };
}

export async function deleteFaqAction(
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await deleteFaq(id);
  if (error) return { error };

  revalidatePath("/dashboard/faq");
  return { error: null };
}
