import { BOOKING_STATUS_VALUES } from "@/lib/constants/booking";
import { z } from "zod";

/** True when an array contains no duplicate values. */
const isUnique = (arr: string[]) => new Set(arr).size === arr.length;

export const createBookingSchema = z.object({
  slot_id: z.string().uuid(),
  // At least one service/package must be selected, with no duplicates.
  service_ids: z
    .array(z.string().uuid())
    .min(1, "Select at least one service")
    .refine(isUnique, "Duplicate services are not allowed"),
  // Optional add-ons selected on top of base packages (no duplicates).
  add_on_ids: z
    .array(z.string().uuid())
    .refine(isUnique, "Duplicate add-ons are not allowed")
    .optional(),
  customer_name: z.string().min(2).max(100),
  customer_email: z.string().email(),
  customer_phone: z.string().min(7).max(20).optional(),
  address_line1: z.string().min(3).max(200),
  address_line2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  notes: z.string().max(500).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const updateBookingStatusSchema = z.object({
  status: z.enum(BOOKING_STATUS_VALUES),
});

export type UpdateBookingStatusInput = z.infer<
  typeof updateBookingStatusSchema
>;

export const cancelBookingSchema = z.object({
  action: z.literal("cancel"),
});
