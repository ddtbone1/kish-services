// Feature: Booking
// Purpose: All booking CRUD and status transition logic
// Added: 2026-05-21

import {
  BOOKING_STATUS,
  VALID_STATUS_TRANSITIONS,
  type BookingStatus,
} from "@/lib/constants/booking";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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

/** Maps a Postgres SQLSTATE from create_booking() to a BookingErrorCode. */
function mapBookingError(pgCode: string | undefined): BookingErrorCode {
  // PT409 = slot conflict (raised); 23505 = unique-index race backstop.
  if (pgCode === "PT409" || pgCode === "23505") return "conflict";
  if (pgCode === "PT422") return "invalid";
  return "error";
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
  });

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Failed to create booking",
      code: error ? mapBookingError(error.code) : "error",
    };
  }

  // The function returns the full bookings row (RETURNS bookings); strip the
  // private owner_notes column before returning to the public flow.
  const { owner_notes: _ownerNotes, ...publicBooking } = data as Booking;
  void _ownerNotes;
  return { data: publicBooking as PublicBooking, error: null, code: null };
}

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
): Promise<{ data: PublicBooking | null; error: string | null }> {
  // Admin client required — anon role has no UPDATE policy on bookings.
  // Security: token is validated via .eq("reference_token", token) before any write.
  const supabase = createAdminClient();

  const { data: current, error: fetchError } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("reference_token", token)
    .single();

  if (fetchError || !current) {
    return { data: null, error: "Booking not found" };
  }

  const allowed = VALID_STATUS_TRANSITIONS[current.status as BookingStatus];
  if (!allowed.includes(BOOKING_STATUS.CANCELLED)) {
    return {
      data: null,
      error: `Cannot cancel a booking with status '${current.status}'`,
    };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: BOOKING_STATUS.CANCELLED,
      cancelled_at: now,
      updated_at: now,
    })
    .eq("id", current.id)
    .select(
      "id, reference_token, slot_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, notes, status, completed_at, cancelled_at, declined_at, created_at, updated_at",
    )
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as PublicBooking, error: null };
}
