import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const BOOKING_EVENT_TYPE = {
  BOOKING_CREATED: "booking_created",
  STATUS_CHANGED: "status_changed",
  CUSTOMER_CANCELLED: "customer_cancelled",
  OWNER_NOTES_UPDATED: "owner_notes_updated",
  EMAIL_RECORDED: "email_recorded",
  RISK_FLAGGED: "risk_flagged",
} as const;

export type BookingEventType =
  (typeof BOOKING_EVENT_TYPE)[keyof typeof BOOKING_EVENT_TYPE];

export type BookingEventActor = "customer" | "owner" | "system";

interface LogBookingEventInput {
  bookingId: string;
  eventType: BookingEventType;
  actorType?: BookingEventActor;
  actorId?: string | null;
  source?: string;
  payload?: Record<string, unknown>;
}

export async function logBookingEvent({
  bookingId,
  eventType,
  actorType = "system",
  actorId = null,
  source = "server",
  payload = {},
}: LogBookingEventInput): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("booking_events").insert({
      booking_id: bookingId,
      event_type: eventType,
      actor_type: actorType,
      actor_id: actorId,
      source,
      payload,
    });

    if (error) {
      logger.warn("booking event insert failed", {
        bookingId,
        eventType,
        error: error.message,
      });
    }
  } catch (err) {
    logger.warn("booking event insert threw", {
      bookingId,
      eventType,
      error: String(err),
    });
  }
}
