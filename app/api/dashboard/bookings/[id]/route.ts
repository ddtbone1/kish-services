import {
  BOOKING_STATUS,
  EMAIL_NOTIFICATION_TYPE,
  type BookingStatus,
  type EmailNotificationType,
} from "@/lib/constants/booking";
import {
  BOOKING_EVENT_TYPE,
  logBookingEvent,
} from "@/lib/services/booking-events.service";
import { updateBookingStatus } from "@/lib/services/booking.service";
import { sendBookingEmail } from "@/lib/services/email.service";
import { createClient } from "@/lib/supabase/server";
import { updateBookingStatusSchema } from "@/lib/validations/booking";
import type { Booking } from "@/types";
import { NextResponse, after, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";

/** Which transactional email corresponds to each owner-visible status. */
const STATUS_EMAIL_MAP: Partial<Record<BookingStatus, EmailNotificationType>> = {
  [BOOKING_STATUS.CONFIRMED]: EMAIL_NOTIFICATION_TYPE.BOOKING_CONFIRMED,
  [BOOKING_STATUS.ON_THE_WAY]: EMAIL_NOTIFICATION_TYPE.BOOKING_ON_THE_WAY,
  [BOOKING_STATUS.COMPLETED]: EMAIL_NOTIFICATION_TYPE.BOOKING_COMPLETED,
  [BOOKING_STATUS.DECLINED]: EMAIL_NOTIFICATION_TYPE.BOOKING_DECLINED,
  [BOOKING_STATUS.CANCELLED]: EMAIL_NOTIFICATION_TYPE.BOOKING_CANCELLED,
};

const updateNotesSchema = z.object({
  action: z.literal("update_notes"),
  owner_notes: z.string().max(2000),
});

const updateStatusSchema = z.object({
  action: z.literal("update_status"),
  status: updateBookingStatusSchema.shape.status,
  reason: z.string().trim().max(500).optional(),
});

const resendEmailSchema = z.object({
  action: z.literal("resend_email"),
});

const patchBodySchema = z.discriminatedUnion("action", [
  updateNotesSchema,
  updateStatusSchema,
  resendEmailSchema,
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.action === "update_status") {
      const { data, error } = await updateBookingStatus(
        id,
        parsed.data.status as BookingStatus,
      );
      if (error) return NextResponse.json({ error }, { status: 400 });

      if (data) {
        const statusPatch: Record<string, string> = {};
        if (parsed.data.reason) {
          statusPatch.status_reason = parsed.data.reason;
          if (parsed.data.status === BOOKING_STATUS.CANCELLED) {
            statusPatch.cancellation_reason = parsed.data.reason;
          }
        }
        if (parsed.data.status === BOOKING_STATUS.CANCELLED) {
          statusPatch.cancelled_by = "owner";
        }
        if (Object.keys(statusPatch).length > 0) {
          await supabase.from("bookings").update(statusPatch).eq("id", id);
        }

        await logBookingEvent({
          bookingId: data.id,
          eventType: BOOKING_EVENT_TYPE.STATUS_CHANGED,
          actorType: "owner",
          actorId: user.id,
          source: "dashboard",
          payload: {
            status: parsed.data.status,
            reason_provided: Boolean(parsed.data.reason),
          },
        });
      }

      // Notify the customer when the owner takes a visible action.
      // Fire-and-forget — don't delay the dashboard response for email I/O.
      if (data) {
        const emailType = STATUS_EMAIL_MAP[parsed.data.status as BookingStatus];
        if (emailType) {
          // Defer with after() so the email (SMTP send + retry backoff) runs to
          // completion on serverless — a bare un-awaited promise can be killed
          // when the function suspends after the response is sent.
          after(async () => {
            try {
              await sendBookingEmail({ booking: data, type: emailType });
            } catch (err) {
              console.error(err);
            }
          });
        }
      }

      // Invalidate the cached dashboard metrics so the next page load reflects
      // the new status counts without waiting for the 60-second TTL.
      revalidateTag("dashboard-metrics", "max");

      return NextResponse.json({ data });
    }

    if (parsed.data.action === "resend_email") {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      const emailType = STATUS_EMAIL_MAP[booking.status as BookingStatus];
      if (!emailType) {
        return NextResponse.json(
          {
            error: `There is no status email to resend for a '${booking.status}' booking.`,
          },
          { status: 400 },
        );
      }

      // Deferred so the SMTP send completes on serverless. sendBookingEmail
      // records its own email_recorded event + email_notifications row.
      after(async () => {
        try {
          await sendBookingEmail({ booking: booking as Booking, type: emailType });
        } catch (err) {
          console.error(err);
        }
      });

      return NextResponse.json({ data: { resent: true, type: emailType } });
    }

    // update_notes
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("bookings")
      .update({ owner_notes: parsed.data.owner_notes, updated_at: now })
      .eq("id", id)
      .select("id, owner_notes, updated_at")
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    await logBookingEvent({
      bookingId: id,
      eventType: BOOKING_EVENT_TYPE.OWNER_NOTES_UPDATED,
      actorType: "owner",
      actorId: user.id,
      source: "dashboard",
      payload: { has_notes: parsed.data.owner_notes.trim().length > 0 },
    });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
