import { answerQuestion } from "@/lib/services/chat.service";
import { chatQuestionSchema } from "@/lib/validations/chat";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
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

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
