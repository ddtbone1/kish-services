import {
  EMAIL_NOTIFICATION_TYPE,
  EMAIL_STATUS,
  type EmailNotificationType,
} from "@/lib/constants/booking";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Booking } from "@/types";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  booking: Booking;
  type: EmailNotificationType;
}

export async function sendBookingEmail({
  booking,
  type,
}: SendEmailParams): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  const subject = getSubjectForType(type);
  const body = getBodyForType(booking, type);

  try {
    const { data, error } = await resend.emails.send({
      from: "Kish Auto Detailing <noreply@kishautodetailing.com>",
      to: booking.customer_email,
      subject,
      html: body,
    });

    // Log the notification
    await admin.from("email_notifications").insert({
      booking_id: booking.id,
      recipient_email: booking.customer_email,
      type,
      provider_message_id: data?.id ?? null,
      status: error ? EMAIL_STATUS.FAILED : EMAIL_STATUS.SENT,
      error_message: error?.message ?? null,
      sent_at: new Date().toISOString(),
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown email error";

    await admin.from("email_notifications").insert({
      booking_id: booking.id,
      recipient_email: booking.customer_email,
      type,
      provider_message_id: null,
      status: EMAIL_STATUS.FAILED,
      error_message: errorMessage,
      sent_at: new Date().toISOString(),
    });

    return { error: errorMessage };
  }
}

function getSubjectForType(type: EmailNotificationType): string {
  switch (type) {
    case EMAIL_NOTIFICATION_TYPE.BOOKING_CONFIRMATION:
      return "Booking Received - Kish Auto Detailing";
    case EMAIL_NOTIFICATION_TYPE.BOOKING_CONFIRMED:
      return "Booking Confirmed - Kish Auto Detailing";
    case EMAIL_NOTIFICATION_TYPE.BOOKING_CANCELLED:
      return "Booking Cancelled - Kish Auto Detailing";
    case EMAIL_NOTIFICATION_TYPE.BOOKING_DECLINED:
      return "Booking Update - Kish Auto Detailing";
    case EMAIL_NOTIFICATION_TYPE.BOOKING_REMINDER:
      return "Appointment Reminder - Kish Auto Detailing";
    default:
      return "Kish Auto Detailing";
  }
}

function getBodyForType(booking: Booking, type: EmailNotificationType): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const bookingLink = `${appUrl}/booking/${booking.reference_token}`;

  switch (type) {
    case EMAIL_NOTIFICATION_TYPE.BOOKING_CONFIRMATION:
      return `
        <h2>Thanks for your booking, ${booking.customer_name}!</h2>
        <p>We've received your booking request and will confirm it shortly.</p>
        <p><a href="${bookingLink}">View or manage your booking</a></p>
      `;
    case EMAIL_NOTIFICATION_TYPE.BOOKING_CONFIRMED:
      return `
        <h2>Your booking is confirmed!</h2>
        <p>Hi ${booking.customer_name}, your auto detailing appointment has been confirmed.</p>
        <p><a href="${bookingLink}">View booking details</a></p>
      `;
    case EMAIL_NOTIFICATION_TYPE.BOOKING_CANCELLED:
      return `
        <h2>Booking Cancelled</h2>
        <p>Hi ${booking.customer_name}, your booking has been cancelled.</p>
        <p>If this was a mistake, please book again at our website.</p>
      `;
    case EMAIL_NOTIFICATION_TYPE.BOOKING_DECLINED:
      return `
        <h2>Booking Update</h2>
        <p>Hi ${booking.customer_name}, unfortunately we're unable to accommodate your booking at the requested time.</p>
        <p>Please try booking a different time slot.</p>
      `;
    default:
      return `<p>Visit <a href="${bookingLink}">your booking</a> for details.</p>`;
  }
}
