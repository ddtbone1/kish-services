import type {
  BookingStatus,
  EmailNotificationType,
  EmailStatus,
} from "@/lib/constants/booking";

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
  service_id: string;
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

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatSession {
  id: string;
  session_id: string;
  question: string;
  answer: string;
  matched_faq_id: string | null;
  confidence_score: number | null;
  was_escalated: boolean;
  created_at: string;
}

// ─── Email Notifications ─────────────────────────────────────────────────────

export interface EmailNotification {
  id: string;
  booking_id: string;
  recipient_email: string;
  type: EmailNotificationType;
  provider_message_id: string | null;
  status: EmailStatus;
  error_message: string | null;
  sent_at: string;
}

// ─── API Response Shapes ─────────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
