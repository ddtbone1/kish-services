import {
  BOOKING_STATUS,
  VALID_STATUS_TRANSITIONS,
  type BookingStatus,
} from "@/lib/constants/booking";
import { createClient } from "@/lib/supabase/server";
import type { CreateBookingInput } from "@/lib/validations/booking";
import type { Booking, PublicBooking } from "@/types";

export async function createBooking(
  input: CreateBookingInput,
): Promise<{ data: PublicBooking | null; error: string | null }> {
  const supabase = await createClient();
  const referenceToken = crypto.randomUUID();

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      ...input,
      reference_token: referenceToken,
      status: BOOKING_STATUS.PENDING,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  const { owner_notes, ...publicData } = data as Booking;
  return { data: publicData, error: null };
}

export async function getBookingByToken(
  token: string,
): Promise<{ data: PublicBooking | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, reference_token, service_id, slot_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, notes, status, completed_at, cancelled_at, declined_at, created_at, updated_at",
    )
    .eq("reference_token", token)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as PublicBooking, error: null };
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

export async function cancelBookingByToken(
  token: string,
): Promise<{ data: PublicBooking | null; error: string | null }> {
  const supabase = await createClient();

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
      "id, reference_token, service_id, slot_id, customer_name, customer_email, customer_phone, address_line1, address_line2, city, notes, status, completed_at, cancelled_at, declined_at, created_at, updated_at",
    )
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as PublicBooking, error: null };
}
