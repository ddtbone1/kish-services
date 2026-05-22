import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ChatQuestionInput } from "@/lib/validations/chat";
import type { FaqEntry } from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

export async function answerQuestion(input: ChatQuestionInput): Promise<{
  data: { answer: string; was_escalated: boolean } | null;
  error: string | null;
}> {
  // Fetch active FAQs to inject as additional grounding context
  const supabase = await createClient();
  const { data: faqs } = await supabase
    .from("faq_entries")
    .select("question, answer")
    .eq("is_active", true);

  const faqContext =
    faqs && faqs.length > 0
      ? "\n\nAdditional FAQ knowledge:\n" +
        (faqs as Pick<FaqEntry, "question" | "answer">[])
          .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
          .join("\n\n")
      : "";

  const fullSystemPrompt = SYSTEM_PROMPT + faqContext;

  // Build Gemini chat history from previous messages
  const history = input.messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: fullSystemPrompt,
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(input.question);
    const rawAnswer = result.response.text();

    const wasEscalated = rawAnswer.includes("[ESCALATE]");
    const answer = rawAnswer.replace(/\[ESCALATE\]\s*$/m, "").trim();

    // Log session via admin client (bypasses RLS)
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
    return { data: null, error: message };
  }
}
