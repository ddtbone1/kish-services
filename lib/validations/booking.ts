import { BOOKING_STATUS_VALUES } from "@/lib/constants/booking";
import { SERVICE_AREA_VALUES } from "@/lib/constants/service-area";
import { z } from "zod";

/** True when an array contains no duplicate values. */
const isUnique = (arr: string[]) => new Set(arr).size === arr.length;

const PH_MOBILE_PATTERN = /^\+639\d{9}$/;

export function normalizePhilippineMobile(input: string): string {
  const compact = input.replace(/[\s().-]/g, "");
  if (/^09\d{9}$/.test(compact)) return `+63${compact.slice(1)}`;
  if (/^639\d{9}$/.test(compact)) return `+${compact}`;
  return compact;
}

/** Customer-selectable vehicle categories (drives effort/equipment). */
export const VEHICLE_TYPES = [
  "sedan",
  "suv",
  "pickup",
  "van",
  "motorcycle",
  "other",
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const createBookingSchema = z
  .object({
    slot_id: z.string().uuid(),
    // At least one service/package must be selected, with no duplicates.
    service_ids: z
      .array(z.string().uuid())
      .min(1, "Select at least one service")
      .refine(isUnique, "Duplicate services are not allowed"),
    customer_name: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .refine((value) => !/\d/.test(value), {
        message: "Full name cannot contain numbers",
      })
      .refine((value) => !/https?:\/\/|www\.|@/.test(value.toLowerCase()), {
        message: "Enter a real customer name",
      }),
    customer_email: z.string().trim().toLowerCase().email(),
    customer_phone: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .transform(normalizePhilippineMobile)
      .refine((value) => PH_MOBILE_PATTERN.test(value), {
        message: "Enter a valid Philippine mobile number",
      }),
    address_line1: z.string().min(3).max(200),
    address_line2: z.string().max(200).optional(),
    city: z.enum(SERVICE_AREA_VALUES, {
      message: "Choose a city or municipality in our service area",
    }),
    notes: z.string().max(500).optional(),

    // ── Consent (Phase 2) ──
    // Single combined acceptance. The server stamps the policy versions and
    // customer_consent_at — they are intentionally NOT accepted from the client.
    accept_terms_privacy: z.literal(true, {
      message: "You must accept the Terms and Privacy Notice to book",
    }),
    environmental_acknowledgement: z.literal(true, {
      message: "You must acknowledge the site and environmental requirements",
    }),

    // ── On-site safety (Phase 3) ──
    vehicle_type: z.enum(VEHICLE_TYPES),
    // Free-text detail; required only when vehicle_type is "other" (see refine).
    vehicle_details: z.string().max(200).optional(),
    // The one mandatory site field — a safe place to park & work.
    parking_available: z.boolean(),
    // Tri-state: omitted = "Not sure" (stored as NULL).
    water_available: z.boolean().optional(),
    electric_available: z.boolean().optional(),
    access_instructions: z.string().max(500).optional(),
    site_safety_notes: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.vehicle_type === "other" && !data.vehicle_details?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vehicle_details"],
        message: "Please describe your vehicle",
      });
    }
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
  reason: z.string().trim().min(3).max(500),
});
