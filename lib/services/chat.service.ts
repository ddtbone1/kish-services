// Feature: Chat / AI
// Purpose: Customer support chatbot powered by Google Gemini 2.5 Flash.
//          FAQ and active service/pricing context are cached at the module level
//          so the prompt refreshes when admin-managed customer content changes.
// Updated: 2026-07-02

import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ChatQuestionInput } from "@/lib/validations/chat";
import type { FaqEntry, Service } from "@/types";
import { GoogleGenerativeAI, type CachedContent } from "@google/generative-ai";
import { createHash } from "crypto";

const BASE_SYSTEM_PROMPT = `You are a friendly and helpful customer support assistant for Kish Auto Detailing Services, a mobile auto detailing business in General Santos City, Philippines.

Business details:
- Name: Kish Auto Detailing Services
- Location: Agan Grandville Block 3 Lot 24, Brgy. City Heights, General Santos City, South Cotabato 9500
- Phone: 0985 204 9882
- Email: kishdetailing@gmail.com
- Facebook: https://www.facebook.com/profile.php?id=61589002202595
- We come to the customer's location - mobile service, no need to drive anywhere.`;

const INSTRUCTIONS_PROMPT = `Booking: Customers can book online at the website by choosing a service, selecting a date/time, and providing their address. After booking they receive a confirmation email with a tracking link to monitor their booking status.

Instructions:
- Be warm, concise, and helpful.
- Answer only questions relevant to the business (services, booking, location, pricing, scheduling, etc.).
- If a customer asks something you genuinely cannot answer based on the information above, end your response with the exact token [ESCALATE] on a new line. Do not include [ESCALATE] for any other reason.
- Never make up prices, availability, or policies not stated above.
- Respond in the same language the customer uses.`;

type ServicePromptRow = Pick<
  Service,
  "name" | "description" | "price" | "duration_minutes"
>;

interface PromptCacheState {
  contentHash: string;
  fullSystemPrompt: string;
  geminiCacheName: string | null;
  expiresAt: number;
}

let promptCache: PromptCacheState | null = null;
const PROMPT_CACHE_TTL_MS = 60 * 60 * 1000;
const PROMPT_CACHE_REFRESH_BUFFER_MS = 5 * 60 * 1000;

function formatServicePrice(price: number) {
  return Number(price).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildServicesContext(services: ServicePromptRow[]) {
  if (services.length === 0) {
    return `Services and prices (PHP):
- Active services are temporarily unavailable in the system. If asked about exact pricing, ask the customer to contact Kish Auto Detailing Services.`;
  }

  return (
    "Services and prices (PHP):\n" +
    services
      .map((service) => {
        const description = service.description
          ? ` - ${service.description}`
          : "";
        return `- ${service.name}: PHP ${formatServicePrice(service.price)}, ~${service.duration_minutes} minutes${description}`;
      })
      .join("\n")
  );
}

function buildFaqContext(faqs: Pick<FaqEntry, "question" | "answer">[]) {
  if (faqs.length === 0) return "";

  return (
    "\n\nAdditional FAQ knowledge:\n" +
    faqs.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`).join("\n\n")
  );
}

async function getOrRefreshPromptCache(
  faqs: Pick<FaqEntry, "question" | "answer">[],
  services: ServicePromptRow[],
): Promise<PromptCacheState> {
  const servicesContext = buildServicesContext(services);
  const faqContext = buildFaqContext(faqs);
  const contentHash = createHash("sha256")
    .update(`${servicesContext}\n\n${faqContext}`)
    .digest("hex");
  const now = Date.now();

  if (
    promptCache &&
    promptCache.contentHash === contentHash &&
    promptCache.expiresAt - now > PROMPT_CACHE_REFRESH_BUFFER_MS
  ) {
    return promptCache;
  }

  const systemInstruction = `${BASE_SYSTEM_PROMPT}\n\n${servicesContext}\n\n${INSTRUCTIONS_PROMPT}`;
  const fullSystemPrompt = systemInstruction + faqContext;

  let geminiCacheName: string | null = null;
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // @ts-expect-error: cacheManager exists in SDK 0.24.1 but is missing from current types.
    if (typeof genAI.cacheManager?.create === "function") {
      // @ts-expect-error: cacheManager exists in SDK 0.24.1 but is missing from current types.
      const cache = await genAI.cacheManager.create({
        model: "models/gemini-2.5-flash",
        systemInstruction,
        contents: faqContext
          ? [{ role: "user", parts: [{ text: faqContext }] }]
          : [],
        ttlSeconds: Math.floor(PROMPT_CACHE_TTL_MS / 1000),
      });
      geminiCacheName = cache.name ?? null;
      logger.info("Gemini context cache created", { cacheName: geminiCacheName });
    }
  } catch (err) {
    logger.warn("Gemini context cache creation failed - using uncached path", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  promptCache = {
    contentHash,
    fullSystemPrompt,
    geminiCacheName,
    expiresAt: now + PROMPT_CACHE_TTL_MS,
  };

  return promptCache;
}

export async function answerQuestion(input: ChatQuestionInput): Promise<{
  data: { answer: string; was_escalated: boolean } | null;
  error: string | null;
}> {
  if (!process.env.GEMINI_API_KEY) {
    logger.error("answerQuestion failed", {
      error: "GEMINI_API_KEY is not configured",
    });
    return {
      data: {
        answer:
          "The AI chat assistant is not configured yet. For help with booking, services, pricing, or scheduling, please contact Kish Auto Detailing Services at 0985 204 9882 or kishdetailing@gmail.com.",
        was_escalated: true,
      },
      error: null,
    };
  }

  const supabase = await createClient();
  const [{ data: faqs }, { data: services }] = await Promise.all([
    supabase.from("faq_entries").select("question, answer").eq("is_active", true),
    supabase
      .from("services")
      .select("name, description, price, duration_minutes")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  const { fullSystemPrompt, geminiCacheName } = await getOrRefreshPromptCache(
    (faqs ?? []) as Pick<FaqEntry, "question" | "answer">[],
    (services ?? []) as ServicePromptRow[],
  );

  const history = input.messages.map((message) => ({
    role: message.role,
    parts: [{ text: message.text }],
  }));

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    let model;
    if (geminiCacheName) {
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
