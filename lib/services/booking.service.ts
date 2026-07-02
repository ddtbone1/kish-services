// Feature: Booking
// Purpose: All booking CRUD and status transition logic
// Added: 2026-05-21

import {
  BOOKING_STATUS,
  VALID_STATUS_TRANSITIONS,
  type BookingStatus,
} from "@/lib/constants/booking";
import {
  BOOKING_TERMS_VERSION,
  CANCELLATION_POLICY,
  ENVIRONMENTAL_ACK_VERSION,
  PRIVACY_NOTICE_VERSION,
} from "@/lib/constants/policy";
import { SERVICE_AREA_STATUS, getServiceArea } from "@/lib/constants/service-area";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canCustomerCancelBooking } from "@/lib/utils/booking-policy";
import type { CreateBookingInput } from "@/lib/validations/booking";
import type { Booking, BookingWithItems, PublicBooking } from "@/types";

/**
 * Discriminates booking-creation failures so the API layer can choose an
 * HTTP status without parsing error strings.
 *   "conflict" → slot unavailable / double-booking race  → 409
 *   "invalid"  → services invalid or inactive             → 422
 *   "error"    → unexpected database/server failure        → 500
 */
export type BookingErrorCode = "conflict" | "invalid" | "error";

export interface BookingRiskFlag {
  code: string;
  severity: "low" | "medium";
}

/** Maps a Postgres SQLSTATE from create_booking() to a BookingErrorCode. */
function mapBookingError(pgCode: string | undefined): BookingErrorCode {
  // PT409 = slot conflict (raised); 23505 = unique-index race backstop.
  if (pgCode === "PT409" || pgCode === "23505") return "conflict";
  if (pgCode === "PT422") return "invalid";
  return "error";
}

function assessBookingRisk(input: CreateBookingInput): BookingRiskFlag[] {
  const flags: BookingRiskFlag[] = [];
  const address = input.address_line1.trim();
  const area = getServiceArea(input.city);

  if (address.length < 10 || !/\d/.test(address)) {
    flags.push({ code: "vague_address", severity: "medium" });
  }

  // Weak/missing phone: no number, or fewer than 7 digits once non-digits are
  // stripped (matches the validation's min length for a usable contact number).
  const phoneDigits = (input.customer_phone ?? "").replace(/\D/g, "");
  if (phoneDigits.length < 7) {
    flags.push({ code: "weak_phone", severity: "medium" });
  }

  if (
    area?.status === SERVICE_AREA_STATUS.EXTENDED ||
    area?.status === SERVICE_AREA_STATUS.MANUAL_REVIEW
  ) {
    flags.push({ code: "location_review", severity: "medium" });
  }

  // Only flag when the customer explicitly said "No". "Not sure" (null/omitted)
  // is the default and would otherwise flag nearly every booking.
  if (input.water_available === false || input.electric_available === false) {
    flags.push({ code: "site_resources_uncertain", severity: "low" });
  }

  return flags;
}

/**
 * Creates a booking atomically via the create_booking() Postgres function.
 *
 * The function validates the slot (exists, not blocked, in the future, not
 * already reserved) and all services, then inserts the booking and
 * booking_items in a single transaction — rolling back everything on any
 * failure. Concurrent bookings for the same slot are
 * serialized (row lock) and backstopped by a partial unique index, so only
 * one can win; the rest surface as "conflict".
 *
 * Prices are snapshotted inside the transaction.
 *
 * @param input - Validated booking fields from createBookingSchema
 * @returns { data, error, code } — `code` is null on success
 * @since 2026-05-21
 */
export async function createBooking(input: CreateBookingInput): Promise<{
  data: PublicBooking | null;
  error: string | null;
  code: BookingErrorCode | null;
}> {
  // Admin client (service_role) — security is enforced at the API boundary
  // (Zod validation) and inside the SECURITY DEFINER function.
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("create_booking", {
    p_slot_id: input.slot_id,
    p_service_ids: input.service_ids,
    p_add_on_ids: [],
    p_customer_name: input.customer_name,
    p_customer_email: input.customer_email,
    p_customer_phone: input.customer_phone ?? null,
    p_address_line1: input.address_line1,
    p_address_line2: input.address_line2 ?? null,
    p_city: input.city,
    p_notes: input.notes ?? null,
    // Consent: versions + timestamp are server-stamped (never trust the client).
    // Reaching here means Zod already enforced accept_terms_privacy === true.
    p_privacy_notice_version: PRIVACY_NOTICE_VERSION,
    p_terms_version: BOOKING_TERMS_VERSION,
    p_transactional_contact_consent: true,
    // On-site safety fields.
    p_vehicle_type: input.vehicle_type,
    p_vehicle_details: input.vehicle_details ?? null,
    p_parking_available: input.parking_available,
    p_water_available: input.water_available ?? null,
    p_electric_available: input.electric_available ?? null,
    p_access_instructions: input.access_instructions ?? null,
    p_site_safety_notes: input.site_safety_notes ?? null,
  });

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Failed to create booking",
      code: error ? mapBookingError(error.code) : "error",
    };
  }

  const bookingRow = data as Booking;
  const now = new Date().toISOString();
  // Environmental acknowledgement is stamped here (not in the RPC). Reaching
  // this point means Zod enforced environmental_acknowledgement === true. The
  // booking itself already succeeded, so a failure here is logged, not fatal.
  const { error: ackError } = await supabase
    .from("bookings")
    .update({
      environmental_ack_version: ENVIRONMENTAL_ACK_VERSION,
      environmental_ack_at: now,
      updated_at: now,
    })
    .eq("id", bookingRow.id);

  if (ackError) {
    logger.warn("environmental ack stamp failed", {
      bookingId: bookingRow.id,
      error: ackError.message,
    });
  }

  // The function returns the full bookings row (RETURNS bookings); strip the
  // private owner_notes column before returning to the public flow.
  const { owner_notes: _ownerNotes, ...publicBooking } = {
    ...bookingRow,
    environmental_ack_version: ENVIRONMENTAL_ACK_VERSION,
    environmental_ack_at: now,
  };
  void _ownerNotes;
  return { data: publicBooking as PublicBooking, error: null, code: null };
}

export { assessBookingRisk };

/**
 * Fetches a booking by its reference token, including all service packages.
 * Excludes owner_notes — safe for public-facing use.
 *
 * @param token - The booking reference token from the customer email link
 * @returns { data: BookingWithItems | null, error: string | null }
 * @since 2026-05-21
 */
export async function getBookingByToken(
  token: string,
): Promise<{ data: BookingWithItems | null; error: string | null }> {
  // Admin client required: the anon RLS SELECT policy checks a JWT claim
  // (reference_token) never present in the anon token. Security is enforced
  // by the .eq("reference_token", token) filter applied below.
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, reference_token, slot_id, customer_name, customer_email,
       customer_phone, address_line1, address_line2, city, notes,
       status, completed_at, cancelled_at, declined_at, created_at, updated_at,
       booking_items ( id, service_id, price_at_booking, service:services ( id, name, duration_minutes ) )`,
    )
    .eq("reference_token", token)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as unknown as BookingWithItems, error: null };
}

export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
): Promise<{ data: Booking | null; error: string | null }> {
  const supabase = await createClient();

  // Fetch current status
  const { data: current, error: fetchError } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .single();

  if (fetchError || !current) {
    return { data: null, error: fetchError?.message ?? "Booking not found" };
  }

  // Validate transition
  const allowed = VALID_STATUS_TRANSITIONS[current.status as BookingStatus];
  if (!allowed.includes(newStatus)) {
    return {
      data: null,
      error: `Cannot transition from '${current.status}' to '${newStatus}'`,
    };
  }

  // Build timestamp fields
  const timestamps: Record<string, string> = {};
  const now = new Date().toISOString();
  if (newStatus === BOOKING_STATUS.COMPLETED) timestamps.completed_at = now;
  if (newStatus === BOOKING_STATUS.CANCELLED) timestamps.cancelled_at = now;
  if (newStatus === BOOKING_STATUS.DECLINED) timestamps.declined_at = now;

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: newStatus, ...timestamps, updated_at: now })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Booking, error: null };
}

/**
 * Cancels a booking by reference token.
 * Only valid if the current status allows cancellation per VALID_STATUS_TRANSITIONS.
 *
 * @param token - The booking reference token
 * @returns { data: PublicBooking | null, error: string | null }
 * @since 2026-05-21
 */
export async function cancelBookingByToken(
  token: string,
  reason?: string,
): Promise<{ data: PublicBooking | null; error: string | null }> {
  // Admin client required — anon role has no UPDATE policy on bookings.
  // Security: token is validated via .eq("reference_token", token) before any write.
  const supabase = createAdminClient();

  const { data: current, error: fetchError } = await supabase
    .from("bookings")
    .select("id, status, slot:availability_slots!slot_id(date, start_time)")
    .eq("reference_token", token)
    .single();

  if (fetchError || !current) {
    return { data: null, error: "Booking not found" };
  }

  const slot = Array.isArray(current.slot) ? current.slot[0] : current.slot;

  // Customer cancel eligibility comes from the shared action-policy (single
  // source of truth with the client UI): only customer-actionable statuses
  // before the cancellation cutoff can be self-cancelled.
  if (!canCustomerCancelBooking(current.status as BookingStatus, slot ?? null)) {
    return {
      data: null,
      error:
        `Cannot cancel this booking online. Self-service cancellation is ` +
        `available until ${CANCELLATION_POLICY.cutoffHours} hours before the appointment.`,
    };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: BOOKING_STATUS.CANCELLED,
      cancelled_at: now,
      cancellation_reason: reason ?? null,
      cancellation_policy_version: CANCELLATION_POLICY.version,
      cancelled_by: "customer",
      updated_at: now,
    })
    .eq("id", current.id)
    .select(
      "id, reference_token, slot_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, notes, status, completed_at, cancelled_at, cancellation_reason, cancellation_policy_version, cancelled_by, declined_at, created_at, updated_at",
    )
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as PublicBooking, error: null };
}
