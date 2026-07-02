"use server";

import {
  getChatEscalationById,
  updateChatEscalation,
} from "@/lib/services/chat-escalation.service";
import { createFaq } from "@/lib/services/faq.service";
import { createClient } from "@/lib/supabase/server";
import { updateChatEscalationSchema } from "@/lib/validations/chat-escalation";
import { createFaqSchema } from "@/lib/validations/faq";
import { revalidatePath } from "next/cache";

export async function updateChatEscalationAction(
  id: string,
  formData: FormData,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const parsed = updateChatEscalationSchema.safeParse({
    status: formData.get("status"),
    owner_notes: formData.get("owner_notes") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid input. Check notes length." };
  }

  const { error } = await updateChatEscalation({
    id,
    status: parsed.data.status,
    ownerNotes: parsed.data.owner_notes,
    ownerId: user.id,
  });

  if (error) return { error };

  revalidatePath("/dashboard/chats");
  return { error: null };
}

export async function createFaqFromEscalationAction(
  escalationId: string,
  formData: FormData,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const parsed = createFaqSchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
    tags: ["chat-escalation"],
  });

  if (!parsed.success) {
    return { error: "Question and answer must each be 5-2000 characters." };
  }

  const { data: escalation, error: escalationError } =
    await getChatEscalationById(escalationId);
  if (escalationError || !escalation) {
    return { error: "Escalated chat not found." };
  }
  if (escalation.escalation_status !== "open") {
    return { error: "This question has already been addressed." };
  }

  const { error: faqError } = await createFaq(parsed.data);
  if (faqError) return { error: faqError };

  const { error: markError } = await updateChatEscalation({
    id: escalationId,
    status: "resolved",
    ownerId: user.id,
  });
  if (markError) {
    return { error: `FAQ created, but the queue did not update: ${markError}` };
  }

  revalidatePath("/dashboard/chats");
  revalidatePath("/dashboard/faq");
  return { error: null };
}
