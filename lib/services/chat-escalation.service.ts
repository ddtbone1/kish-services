import { createClient } from "@/lib/supabase/server";
import type {
  ChatEscalation,
  ChatEscalationStatus,
} from "@/types";

export async function getChatEscalations(
  status: ChatEscalationStatus | "all" = "open",
): Promise<{ data: ChatEscalation[] | null; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("chat_sessions")
    .select(
      `id, session_id, question, answer, confidence_score, was_escalated,
       escalation_status, owner_notes, resolved_at, resolved_by, created_at`,
    )
    .eq("was_escalated", true)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("escalation_status", status);
  }

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as ChatEscalation[], error: null };
}

export async function getChatEscalationById(
  id: string,
): Promise<{ data: ChatEscalation | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_sessions")
    .select(
      `id, session_id, question, answer, confidence_score, was_escalated,
       escalation_status, owner_notes, resolved_at, resolved_by, created_at`,
    )
    .eq("id", id)
    .eq("was_escalated", true)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as ChatEscalation, error: null };
}

export async function updateChatEscalation({
  id,
  status,
  ownerNotes,
  ownerId,
}: {
  id: string;
  status: ChatEscalationStatus;
  ownerNotes?: string;
  ownerId: string;
}): Promise<{ data: ChatEscalation | null; error: string | null }> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const isResolved = status === "resolved";
  const patch: Record<string, string | null> = {
    escalation_status: status,
    resolved_at: isResolved ? now : null,
    resolved_by: isResolved ? ownerId : null,
  };

  if (ownerNotes !== undefined) {
    patch.owner_notes = ownerNotes.trim() || null;
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .update(patch)
    .eq("id", id)
    .eq("was_escalated", true)
    .select(
      `id, session_id, question, answer, confidence_score, was_escalated,
       escalation_status, owner_notes, resolved_at, resolved_by, created_at`,
    )
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as ChatEscalation, error: null };
}
