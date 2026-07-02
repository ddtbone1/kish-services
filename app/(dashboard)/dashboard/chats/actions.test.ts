import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetChatEscalationById = vi.hoisted(() => vi.fn());
const mockUpdateChatEscalation = vi.hoisted(() => vi.fn());
const mockCreateFaq = vi.hoisted(() => vi.fn());
const mockAuthGetUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/chat-escalation.service", () => ({
  getChatEscalationById: mockGetChatEscalationById,
  updateChatEscalation: mockUpdateChatEscalation,
}));

vi.mock("@/lib/services/faq.service", () => ({
  createFaq: mockCreateFaq,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockAuthGetUser },
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

import { createFaqFromEscalationAction } from "./actions";

function makeFaqFormData() {
  const formData = new FormData();
  formData.set("question", "Do you service covered parking?");
  formData.set("answer", "Yes, as long as the space is safe and accessible.");
  return formData;
}

describe("createFaqFromEscalationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: "owner-1" } },
    });
    mockGetChatEscalationById.mockResolvedValue({
      data: { id: "chat-1", escalation_status: "open" },
      error: null,
    });
    mockCreateFaq.mockResolvedValue({ data: { id: "faq-1" }, error: null });
    mockUpdateChatEscalation.mockResolvedValue({
      data: { id: "chat-1" },
      error: null,
    });
  });

  it("creates a tagged FAQ and marks the escalation addressed", async () => {
    const result = await createFaqFromEscalationAction(
      "chat-1",
      makeFaqFormData(),
    );

    expect(result.error).toBeNull();
    expect(mockGetChatEscalationById).toHaveBeenCalledWith("chat-1");
    expect(mockCreateFaq).toHaveBeenCalledWith({
      question: "Do you service covered parking?",
      answer: "Yes, as long as the space is safe and accessible.",
      tags: ["chat-escalation"],
    });
    expect(mockUpdateChatEscalation).toHaveBeenCalledWith({
      id: "chat-1",
      status: "resolved",
      ownerId: "owner-1",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/chats");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/faq");
  });

  it("does not create a FAQ when the escalation is already addressed", async () => {
    mockGetChatEscalationById.mockResolvedValue({
      data: { id: "chat-1", escalation_status: "resolved" },
      error: null,
    });

    const result = await createFaqFromEscalationAction(
      "chat-1",
      makeFaqFormData(),
    );

    expect(result.error).toContain("already been addressed");
    expect(mockCreateFaq).not.toHaveBeenCalled();
    expect(mockUpdateChatEscalation).not.toHaveBeenCalled();
  });

  it("returns an error when the escalation row is missing or not escalated", async () => {
    mockGetChatEscalationById.mockResolvedValue({
      data: null,
      error: "No rows returned",
    });

    const result = await createFaqFromEscalationAction(
      "chat-1",
      makeFaqFormData(),
    );

    expect(result.error).toBe("Escalated chat not found.");
    expect(mockCreateFaq).not.toHaveBeenCalled();
    expect(mockUpdateChatEscalation).not.toHaveBeenCalled();
  });
});
