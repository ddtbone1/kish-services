import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().min(1).max(2000),
});

export const chatQuestionSchema = z.object({
  session_id: z.string().min(1).max(100),
  question: z.string().min(1).max(1000),
  messages: z.array(chatMessageSchema).max(50).default([]),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatQuestionInput = z.infer<typeof chatQuestionSchema>;
