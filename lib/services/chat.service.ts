import { CONFIDENCE_THRESHOLD, ESCALATION_MESSAGE } from "@/lib/constants/chat";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ChatQuestionInput } from "@/lib/validations/chat";
import type { FaqEntry } from "@/types";

/**
 * Phase 1: Simple keyword/text matching against faq_entries.
 * Returns the best matching FAQ answer or escalation message.
 */
export async function answerQuestion(
  input: ChatQuestionInput,
): Promise<{
  data: { answer: string; was_escalated: boolean } | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // Fetch all active FAQs (Phase 1: in-memory matching; Phase 2: pgvector)
  const { data: faqs, error } = await supabase
    .from("faq_entries")
    .select("*")
    .eq("is_active", true);

  if (error) return { data: null, error: error.message };

  const { bestMatch, confidence } = findBestMatch(
    input.question,
    faqs as FaqEntry[],
  );

  const wasEscalated = confidence < CONFIDENCE_THRESHOLD;
  const answer = wasEscalated ? ESCALATION_MESSAGE : bestMatch!.answer;

  // Log chat session (using admin client to bypass RLS for insert)
  const admin = createAdminClient();
  await admin.from("chat_sessions").insert({
    session_id: input.session_id,
    question: input.question,
    answer,
    matched_faq_id: bestMatch?.id ?? null,
    confidence_score: confidence,
    was_escalated: wasEscalated,
  });

  return { data: { answer, was_escalated: wasEscalated }, error: null };
}

/**
 * Simple keyword overlap scoring.
 * Returns the best matching FAQ and a confidence score 0–1.
 */
function findBestMatch(
  question: string,
  faqs: FaqEntry[],
): { bestMatch: FaqEntry | null; confidence: number } {
  if (!faqs || faqs.length === 0) {
    return { bestMatch: null, confidence: 0 };
  }

  const questionWords = tokenize(question);
  let bestMatch: FaqEntry | null = null;
  let bestScore = 0;

  for (const faq of faqs) {
    const faqWords = tokenize(faq.question);
    const overlap = questionWords.filter((w) => faqWords.includes(w)).length;
    const score = questionWords.length > 0 ? overlap / questionWords.length : 0;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  return { bestMatch, confidence: bestScore };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}
