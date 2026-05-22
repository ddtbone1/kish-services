import type { BookingStatus } from "@/lib/constants/booking";

// ─── Services ────────────────────────────────────────────────────────────────

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at: string;
}

// ─── Availability ────────────────────────────────────────────────────────────

export interface AvailabilitySlot {
  id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  is_blocked: boolean;
  created_at: string;
}

export interface AvailabilityTemplate {
  id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export interface Booking {
  id: string;
  reference_token: string;
  // security: service_id removed — bookings now support multiple services via booking_items
  slot_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  notes: string | null;
  owner_notes: string | null; // private — never exposed to customer-facing APIs
  status: BookingStatus;
  completed_at: string | null;
  cancelled_at: string | null;
  declined_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Booking fields safe to return in public-facing routes (no owner_notes) */
export type PublicBooking = Omit<Booking, "owner_notes">;

/** A service/package line item within a booking — price is snapshotted at booking time */
export interface BookingItem {
  id: string;
  booking_id: string;
  service_id: string;
  price_at_booking: number;
  // Joined field when fetched with service data
  service?: Service;
}

/** An optional add-on that can be selected on top of base packages */
export interface AddOn {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** An add-on line item within a booking — price is snapshotted at booking time */
export interface BookingAddOn {
  id: string;
  booking_id: string;
  add_on_id: string;
  price_at_booking: number;
  // Joined field when fetched with add-on data
  add_on?: AddOn;
}

/** Full booking with all line items — used in dashboard detail view */
export interface BookingWithItems extends PublicBooking {
  booking_items: BookingItem[];
  booking_add_ons: BookingAddOn[];
}

/** Full booking including owner_notes and joined slot — owner dashboard only */
export interface OwnerBookingDetail extends Booking {
  booking_items: BookingItem[];
  booking_add_ons: BookingAddOn[];
  slot: Pick<
    AvailabilitySlot,
    "id" | "date" | "start_time" | "end_time"
  > | null;
}

/** Slim booking row for the owner dashboard list */
export interface BookingListItem {
  id: string;
  reference_token: string;
  customer_name: string;
  city: string;
  status: BookingStatus;
  created_at: string;
  booking_items: Array<{
    price_at_booking: number;
    service: { name: string } | null;
  }>;
  slot: { date: string; start_time: string } | null;
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  tags: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
