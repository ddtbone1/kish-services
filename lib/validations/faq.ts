import { z } from "zod";

export const createFaqSchema = z.object({
  question: z.string().min(5).max(500),
  answer: z.string().min(5).max(2000),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export type CreateFaqInput = z.infer<typeof createFaqSchema>;

export const updateFaqSchema = z.object({
  question: z.string().min(5).max(500).optional(),
  answer: z.string().min(5).max(2000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  is_active: z.boolean().optional(),
});

export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;
