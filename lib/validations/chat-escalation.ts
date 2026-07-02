import { z } from "zod";

export const chatEscalationStatusSchema = z.enum(["open", "resolved"]);

export const updateChatEscalationSchema = z.object({
  status: chatEscalationStatusSchema,
  owner_notes: z.string().trim().max(2000).optional(),
});

export type ChatEscalationStatusInput = z.infer<
  typeof chatEscalationStatusSchema
>;

export type UpdateChatEscalationInput = z.infer<
  typeof updateChatEscalationSchema
>;
