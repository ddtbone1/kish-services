import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFrom = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

import {
  getChatEscalationById,
  getChatEscalations,
  updateChatEscalation,
} from "./chat-escalation.service";

describe("chat-escalation.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists open escalated chat sessions by default", async () => {
    const rows = [{ id: "chat-1", escalation_status: "open" }];
    const eqStatus = vi.fn().mockResolvedValue({ data: rows, error: null });
    const order = vi.fn().mockReturnValue({ eq: eqStatus });
    const eqEscalated = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq: eqEscalated });
    mockFrom.mockReturnValue({ select });

    const result = await getChatEscalations();

    expect(result.error).toBeNull();
    expect(result.data).toEqual(rows);
    expect(eqEscalated).toHaveBeenCalledWith("was_escalated", true);
    expect(eqStatus).toHaveBeenCalledWith("escalation_status", "open");
  });

  it("does not apply status filter when listing all escalations", async () => {
    const rows = [{ id: "chat-1", escalation_status: "resolved" }];
    const order = vi.fn().mockResolvedValue({ data: rows, error: null });
    const eqEscalated = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq: eqEscalated });
    mockFrom.mockReturnValue({ select });

    const result = await getChatEscalations("all");

    expect(result.error).toBeNull();
    expect(result.data).toEqual(rows);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("fetches one escalated chat by id", async () => {
    const row = { id: "chat-1", was_escalated: true };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const eqEscalated = vi.fn().mockReturnValue({ single });
    const eqId = vi.fn().mockReturnValue({ eq: eqEscalated });
    const select = vi.fn().mockReturnValue({ eq: eqId });
    mockFrom.mockReturnValue({ select });

    const result = await getChatEscalationById("chat-1");

    expect(result.error).toBeNull();
    expect(result.data).toEqual(row);
    expect(eqId).toHaveBeenCalledWith("id", "chat-1");
    expect(eqEscalated).toHaveBeenCalledWith("was_escalated", true);
  });

  it("marks an escalation resolved with owner metadata", async () => {
    const updated = {
      id: "chat-1",
      escalation_status: "resolved",
      owner_notes: "Called customer.",
      resolved_by: "owner-1",
    };
    const single = vi.fn().mockResolvedValue({ data: updated, error: null });
    const selectAfterUpdate = vi.fn().mockReturnValue({ single });
    const eqEscalated = vi.fn().mockReturnValue({ select: selectAfterUpdate });
    const eqId = vi.fn().mockReturnValue({ eq: eqEscalated });
    const update = vi.fn().mockReturnValue({ eq: eqId });
    mockFrom.mockReturnValue({ update });

    const result = await updateChatEscalation({
      id: "chat-1",
      status: "resolved",
      ownerNotes: "Called customer.",
      ownerId: "owner-1",
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(updated);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        escalation_status: "resolved",
        owner_notes: "Called customer.",
        resolved_by: "owner-1",
      }),
    );
  });

  it("preserves owner notes when no ownerNotes value is provided", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "chat-1", escalation_status: "resolved" },
      error: null,
    });
    const selectAfterUpdate = vi.fn().mockReturnValue({ single });
    const eqEscalated = vi.fn().mockReturnValue({ select: selectAfterUpdate });
    const eqId = vi.fn().mockReturnValue({ eq: eqEscalated });
    const update = vi.fn().mockReturnValue({ eq: eqId });
    mockFrom.mockReturnValue({ update });

    await updateChatEscalation({
      id: "chat-1",
      status: "resolved",
      ownerId: "owner-1",
    });

    expect(update).toHaveBeenCalledWith(
      expect.not.objectContaining({ owner_notes: expect.anything() }),
    );
  });
});
