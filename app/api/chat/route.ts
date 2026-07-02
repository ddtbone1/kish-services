import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { answerQuestion } from "@/lib/services/chat.service";
import { sendChatEscalationNotification } from "@/lib/services/email.service";
import { withRequestContext } from "@/lib/utils/with-request-context";
import { chatQuestionSchema } from "@/lib/validations/chat";
import { NextResponse, after, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  return withRequestContext(request, async () => {
    const ip = getClientIp(request);
    const { limited, retryAfter } = await checkRateLimit(
      ip,
      "chat",
      30,
      60 * 1000,
    );
    if (limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    try {
      const body = await request.json();
      const parsed = chatQuestionSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const { data, error } = await answerQuestion(parsed.data);

      if (error || !data) {
        return NextResponse.json(
          { error: error ?? "Failed to process question" },
          { status: 500 },
        );
      }

      if (data.was_escalated) {
        after(async () => {
          await sendChatEscalationNotification({
            sessionId: parsed.data.session_id,
            question: parsed.data.question,
            answer: data.answer,
          });
        });
      }

      return NextResponse.json({ data });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}
