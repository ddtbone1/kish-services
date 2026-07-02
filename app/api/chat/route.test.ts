import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAnswerQuestion = vi.hoisted(() => vi.fn());
const mockSendChatEscalationNotification = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/chat.service", () => ({
  answerQuestion: mockAnswerQuestion,
}));

vi.mock("@/lib/services/email.service", () => ({
  sendChatEscalationNotification: mockSendChatEscalationNotification,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/utils/with-request-context", () => ({
  withRequestContext: vi.fn((_req: unknown, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (fn: () => unknown) => {
    void fn();
  },
}));

import { POST } from "./route";

const VALID_BODY = {
  session_id: "session-123",
  question: "Can you handle this unusual request?",
  messages: [],
};

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ limited: false, retryAfter: 0 });
    mockSendChatEscalationNotification.mockResolvedValue({ error: null });
  });

  it("sends an owner email when the chat is escalated", async () => {
    mockAnswerQuestion.mockResolvedValue({
      data: { answer: "Please wait for the owner.", was_escalated: true },
      error: null,
    });

    const res = await POST(makePostRequest(VALID_BODY));

    expect(res.status).toBe(200);
    expect(mockSendChatEscalationNotification).toHaveBeenCalledWith({
      sessionId: "session-123",
      question: "Can you handle this unusual request?",
      answer: "Please wait for the owner.",
    });
  });

  it("does not send escalation email for normal chat answers", async () => {
    mockAnswerQuestion.mockResolvedValue({
      data: { answer: "Yes, we can help.", was_escalated: false },
      error: null,
    });

    const res = await POST(makePostRequest(VALID_BODY));

    expect(res.status).toBe(200);
    expect(mockSendChatEscalationNotification).not.toHaveBeenCalled();
  });
});
