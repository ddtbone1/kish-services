import { z } from "zod";

export const createSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be HH:MM or HH:MM:SS"),
  end_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be HH:MM or HH:MM:SS"),
});

export type CreateSlotInput = z.infer<typeof createSlotSchema>;

export const updateSlotSchema = z.object({
  is_blocked: z.boolean(),
});

export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;
