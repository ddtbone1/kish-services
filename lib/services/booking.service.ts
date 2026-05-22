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
 * Creates a new booking with one or more service packages and optional add-ons.
 * Prices are snapshotted at booking time so future price changes don't affect history.
 *
 * @param input - Validated booking fields from createBookingSchema
 * @returns { data: PublicBooking | null, error: string | null }
 * @since 2026-05-21
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<{ data: PublicBooking | null; error: string | null }> {
  // Admin client bypasses RLS — security is enforced at the API boundary
  // (Zod validation) and by server-side token generation.
  const supabase = createAdminClient();
  const referenceToken = crypto.randomUUID();

  const { service_ids, add_on_ids, ...bookingFields } = input;

  // 1. Insert the booking header record
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      ...bookingFields,
      reference_token: referenceToken,
      status: BOOKING_STATUS.PENDING,
    })
    .select(
      "id, reference_token, slot_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, notes, status, completed_at, cancelled_at, declined_at, created_at, updated_at",
    )
    .single();

  if (bookingError || !booking) {
    return {
      data: null,
      error: bookingError?.message ?? "Failed to create booking",
    };
  }

  // 2. Fetch current prices for selected services (snapshot at booking time)
  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, price")
    .in("id", service_ids)
    .eq("is_active", true);

  if (servicesError || !services || services.length !== service_ids.length) {
    return {
      data: null,
      error: "One or more selected services are unavailable",
    };
  }

  // 3. Insert booking_items (one per selected service)
  const bookingItems = services.map((s) => ({
    booking_id: booking.id,
    service_id: s.id,
    price_at_booking: s.price,
  }));

  const { error: itemsError } = await supabase
    .from("booking_items")
    .insert(bookingItems);

  if (itemsError) {
    return { data: null, error: itemsError.message };
  }

  // 4. Insert booking_add_ons if any were selected
  if (add_on_ids && add_on_ids.length > 0) {
    const { data: addOns, error: addOnsError } = await supabase
      .from("add_ons")
      .select("id, price")
      .in("id", add_on_ids)
      .eq("is_active", true);

    if (addOnsError || !addOns || addOns.length !== add_on_ids.length) {
      return {
        data: null,
        error: "One or more selected add-ons are unavailable",
      };
    }

    const bookingAddOns = addOns.map((a) => ({
      booking_id: booking.id,
      add_on_id: a.id,
      price_at_booking: a.price,
    }));

    const { error: addOnsInsertError } = await supabase
      .from("booking_add_ons")
      .insert(bookingAddOns);

    if (addOnsInsertError) {
      return { data: null, error: addOnsInsertError.message };
    }
  }

  return { data: booking as PublicBooking, error: null };
}

/**
 * Fetches a booking by its reference token, including all service packages and add-ons.
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
       booking_items ( id, service_id, price_at_booking, service:services ( id, name, duration_minutes ) ),
       booking_add_ons ( id, add_on_id, price_at_booking, add_on:add_ons ( id, name ) )`,
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
