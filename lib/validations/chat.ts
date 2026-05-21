import { z } from "zod";

export const chatQuestionSchema = z.object({
  session_id: z.string().min(1).max(100),
  question: z.string().min(1).max(1000),
});

export type ChatQuestionInput = z.infer<typeof chatQuestionSchema>;
