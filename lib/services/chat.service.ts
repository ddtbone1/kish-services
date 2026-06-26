// Feature: Chat / AI
// Purpose: Customer support chatbot powered by Google Gemini 2.5 Flash.
//          Cost optimisation: FAQ entries are cached at the module level so
//          Supabase is only queried when the cache expires or the FAQ content
//          changes. Gemini Context Caching is attempted to store the system
//          prompt + FAQ context server-side for ~1/4 the normal input token rate.
// Updated: 2026-06-25

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { ChatQuestionInput } from "@/lib/validations/chat";
import type { FaqEntry } from "@/types";
import { GoogleGenerativeAI, type CachedContent } from "@google/generative-ai";
import { createHash } from "crypto";

const SYSTEM_PROMPT = `You are a friendly and helpful customer support assistant for Kish Auto Detailing Services, a mobile auto detailing business in General Santos City, Philippines.

Business details:
- Name: Kish Auto Detailing Services
- Location: Agan Grandville Block 3 Lot 24, Brgy. City Heights, General Santos City, South Cotabato 9500
- Phone: 0985 204 9882
- Email: kishdetailing@gmail.com
- Facebook: https://www.facebook.com/profile.php?id=61589002202595
- We come to the customer's location — mobile service, no need to drive anywhere.

Services and prices (PHP ₱):
- Interior Detailing: ₱800, ~90 minutes
- Lens Restoration: ₱500, ~45 minutes
- Buffing: ₱1,500, ~120 minutes
- Back to Zero Odor / Disinfection: ₱800, ~60 minutes

Add-ons:
- Engine Bay Cleaning: ₱400
- Tire Dressing: ₱250
- Ceramic Coating (Basic): ₱2,000

Booking: Customers can book online at the website by choosing a service, selecting a date/time, and providing their address. After booking they receive a confirmation email with a tracking link to monitor their booking status.

Instructions:
- Be warm, concise, and helpful.
- Answer only questions relevant to the business (services, booking, location, pricing, scheduling, etc.).
- If a customer asks something you genuinely cannot answer based on the information above, end your response with the exact token [ESCALATE] on a new line. Do not include [ESCALATE] for any other reason.
- Never make up prices, availability, or policies not stated above.
- Respond in the same language the customer uses.`;

// ─── Module-level FAQ cache ───────────────────────────────────────────────────
// Cached in memory so each lambda instance only pays the Supabase round-trip
// once per hour rather than once per chat message.

interface FaqCacheState {
  faqHash: string;
  fullSystemPrompt: string;
  geminiCacheName: string | null; // Gemini-side cached content name; null = uncached
  expiresAt: number; // Date.now() ms
}

let faqCache: FaqCacheState | null = null;
const FAQ_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FAQ_CACHE_REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

async function getOrRefreshFaqCache(
  faqs: Pick<FaqEntry, "question" | "answer">[],
): Promise<FaqCacheState> {
  const faqContext =
    faqs.length > 0
      ? "\n\nAdditional FAQ knowledge:\n" +
        faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")
      : "";

  const faqHash = createHash("sha256").update(faqContext).digest("hex");
  const now = Date.now();

  // Return the cached state when it's still fresh and FAQs haven't changed.
  if (
    faqCache &&
    faqCache.faqHash === faqHash &&
    faqCache.expiresAt - now > FAQ_CACHE_REFRESH_BUFFER_MS
  ) {
    return faqCache;
  }

  const fullSystemPrompt = SYSTEM_PROMPT + faqContext;

  // Attempt to create a Gemini Context Cache so the system prompt + FAQ context
  // is stored server-side. Cached tokens are billed at ~1/4 the normal rate.
  let geminiCacheName: string | null = null;
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    // @ts-expect-error: cacheManager exists in SDK 0.24.1 but is missing from current types.
    if (typeof genAI.cacheManager?.create === "function") {
      // @ts-expect-error: cacheManager exists in SDK 0.24.1 but is missing from current types.
      const cache = await genAI.cacheManager.create({
        model: "models/gemini-2.5-flash",
        systemInstruction: SYSTEM_PROMPT,
        contents: faqContext
          ? [{ role: "user", parts: [{ text: faqContext }] }]
          : [],
        ttlSeconds: Math.floor(FAQ_CACHE_TTL_MS / 1000),
      });
      geminiCacheName = cache.name ?? null;
      logger.info("Gemini context cache created", { cacheName: geminiCacheName });
    }
  } catch (err) {
    logger.warn("Gemini context cache creation failed — using uncached path", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  faqCache = {
    faqHash,
    fullSystemPrompt,
    geminiCacheName,
    expiresAt: now + FAQ_CACHE_TTL_MS,
  };

  return faqCache;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function answerQuestion(input: ChatQuestionInput): Promise<{
  data: { answer: string; was_escalated: boolean } | null;
  error: string | null;
}> {
  // Fetch active FAQs — result is cached in memory after the first call.
  const supabase = await createClient();
  const { data: faqs } = await supabase
    .from("faq_entries")
    .select("question, answer")
    .eq("is_active", true);

  const { fullSystemPrompt, geminiCacheName } = await getOrRefreshFaqCache(
    (faqs ?? []) as Pick<FaqEntry, "question" | "answer">[],
  );

  // Build Gemini chat history from previous messages.
  const history = input.messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    let model;
    if (geminiCacheName) {
      // Use the cached content — input tokens for system prompt + FAQ are billed
      // at ~1/4 the normal rate on subsequent requests in the same cache window.
      const cachedContent: CachedContent = {
        name: geminiCacheName,
        contents: [],
      };
      model = genAI.getGenerativeModelFromCachedContent(cachedContent, {
        model: "models/gemini-2.5-flash",
      });
    } else {
      model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: fullSystemPrompt,
      });
    }

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(input.question);
    const rawAnswer = result.response.text();

    const wasEscalated = rawAnswer.includes("[ESCALATE]");
    const answer = rawAnswer.replace(/\[ESCALATE\]\s*$/m, "").trim();

    // Log session via admin client (bypasses RLS).
    const admin = createAdminClient();
    await admin.from("chat_sessions").insert({
      session_id: input.session_id,
      question: input.question,
      answer,
      matched_faq_id: null,
      confidence_score: wasEscalated ? 0 : 1,
      was_escalated: wasEscalated,
    });

    return { data: { answer, was_escalated: wasEscalated }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini API error";
    logger.error("answerQuestion failed", { error: message });
    return { data: null, error: message };
  }
}
