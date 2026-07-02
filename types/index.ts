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

export type PublicAvailabilityStatus =
  | "available"
  | "booked"
  | "blocked"
  | "past";

export interface PublicAvailabilitySlot extends AvailabilitySlot {
  availability_status: PublicAvailabilityStatus;
  availability_label: string;
  is_available: boolean;
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
  // ── Consent (Phase 2) — server-stamped at creation ──
  privacy_notice_version: string | null;
  terms_version: string | null;
  customer_consent_at: string | null;
  transactional_contact_consent: boolean;
  environmental_ack_version: string | null;
  environmental_ack_at: string | null;
  // ── On-site safety (Phase 3) ──
  vehicle_type: string | null;
  vehicle_details: string | null;
  parking_available: boolean | null;
  water_available: boolean | null; // tri-state: true/false/null ("not sure")
  electric_available: boolean | null; // tri-state: true/false/null ("not sure")
  access_instructions: string | null;
  site_safety_notes: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancellation_policy_version: string | null;
  cancelled_by: string | null;
  declined_at: string | null;
  status_reason: string | null;
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

/** Full booking with service line items — used in public booking views */
export interface BookingWithItems extends PublicBooking {
  booking_items: BookingItem[];
}

/** Full booking including owner_notes and joined slot — owner dashboard only */
export interface OwnerBookingDetail extends Booking {
  booking_items: BookingItem[];
  slot: Pick<
    AvailabilitySlot,
    "id" | "date" | "start_time" | "end_time"
  > | null;
  booking_events?: BookingEvent[];
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

export interface BookingEvent {
  id: string;
  booking_id: string;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  source: string;
  payload: Record<string, unknown>;
  created_at: string;
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

export type ChatEscalationStatus = "open" | "resolved";

export interface ChatEscalation {
  id: string;
  session_id: string;
  question: string;
  answer: string;
  confidence_score: number | null;
  was_escalated: boolean;
  escalation_status: ChatEscalationStatus;
  owner_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}
