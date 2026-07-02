import { z } from "zod";

const priceSchema = z.coerce
  .number()
  .min(0, "Price must be at least 0")
  .max(999999.99, "Price is too high")
  .refine((value) => Number.isFinite(value), "Price must be a valid number")
  .refine(
    (value) => Number.isInteger(Math.round(value * 100)),
    "Price can have at most 2 decimal places",
  );

export const createServiceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => value || null),
  duration_minutes: z.coerce.number().int().min(15).max(1440),
  price: priceSchema,
  is_active: z.boolean().optional().default(true),
});

export const updateServiceSchema = createServiceSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
