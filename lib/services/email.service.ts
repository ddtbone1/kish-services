import {
  EMAIL_NOTIFICATION_TYPE,
  EMAIL_STATUS,
  type EmailNotificationType,
} from "@/lib/constants/booking";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { Booking } from "@/types";
import nodemailer, { type SendMailOptions } from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false, // STARTTLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM_ADDRESS = `Kish Auto Detailing <${process.env.SMTP_USER ?? "noreply@kishautodetailing.com"}>`;

// Retry delays: 1 s, 4 s, 16 s — exponential backoff; total max wait ~21 s.
// The initial attempt + 3 retries = 4 total SMTP tries before giving up.
const RETRY_DELAYS_MS = [1_000, 4_000, 16_000];

async function sendWithRetry(mailOptions: SendMailOptions): Promise<number> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      await createTransporter().sendMail(mailOptions);
      return attempt; // return how many retries were needed (0 = first try)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAYS_MS[attempt]),
        );
      }
    }
  }

  throw lastError!;
}

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
  const html = getBodyForType(booking, type);

  let retryCount = 0;
  let errorMessage: string | null = null;

  try {
    retryCount = await sendWithRetry({
      from: FROM_ADDRESS,
      to: booking.customer_email,
      subject,
      html,
    });
  } catch (err) {
    retryCount = RETRY_DELAYS_MS.length;
    errorMessage = err instanceof Error ? err.message : "Unknown email error";
    logger.error("sendBookingEmail failed after retries", {
      type,
      bookingId: booking.id,
      error: errorMessage,
    });
  }

  await admin.from("email_notifications").insert({
    booking_id: booking.id,
    recipient_email: booking.customer_email,
    type,
    provider_message_id: null,
    status: errorMessage ? EMAIL_STATUS.FAILED : EMAIL_STATUS.SENT,
    error_message: errorMessage,
    retry_count: retryCount,
    next_retry_at: null,
    sent_at: new Date().toISOString(),
  });

  return { error: errorMessage };
}

// ─── Admin notification ───────────────────────────────────────────────────────

export async function sendAdminNotification(
  booking: Booking,
): Promise<{ error: string | null }> {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.warn(
      "[email.service] ADMIN_EMAIL is not set — skipping admin notification",
    );
    return { error: null };
  }

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const dashboardLink = `${appUrl}/dashboard/bookings/${booking.id}`;

  const subject = `New Booking – ${booking.customer_name}`;
  const html = `
    <h2>New booking received</h2>
    <table style="border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Customer</td><td><strong>${booking.customer_name}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Email</td><td>${booking.customer_email}</td></tr>
      ${booking.customer_phone ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Phone</td><td>${booking.customer_phone}</td></tr>` : ""}
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Address</td><td>${booking.address_line1}${booking.address_line2 ? ", " + booking.address_line2 : ""}, ${booking.city}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Reference</td><td>${booking.reference_token}</td></tr>
    </table>
    <p style="margin-top:16px;">
      <a href="${dashboardLink}" style="background:#14b8a6;color:#fff;padding:10px 20px;border-radius:24px;text-decoration:none;font-weight:600;">
        View &amp; Respond in Dashboard
      </a>
    </p>
  `;

  let retryCount = 0;
  let errorMessage: string | null = null;

  try {
    retryCount = await sendWithRetry({
      from: FROM_ADDRESS,
      to: adminEmail,
      subject,
      html,
    });
  } catch (err) {
    retryCount = RETRY_DELAYS_MS.length;
    errorMessage = err instanceof Error ? err.message : "Unknown email error";
    logger.error("sendAdminNotification failed after retries", {
      bookingId: booking.id,
      error: errorMessage,
    });
  }

  await admin.from("email_notifications").insert({
    booking_id: booking.id,
    recipient_email: adminEmail,
    type: EMAIL_NOTIFICATION_TYPE.ADMIN_BOOKING_ALERT,
    provider_message_id: null,
    status: errorMessage ? EMAIL_STATUS.FAILED : EMAIL_STATUS.SENT,
    error_message: errorMessage,
    retry_count: retryCount,
    next_retry_at: null,
    sent_at: new Date().toISOString(),
  });

  return { error: errorMessage };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSubjectForType(type: EmailNotificationType): string {
  switch (type) {
    case EMAIL_NOTIFICATION_TYPE.BOOKING_CONFIRMATION:
      return "Booking Received - Kish Auto Detailing";
    case EMAIL_NOTIFICATION_TYPE.BOOKING_CONFIRMED:
      return "Booking Confirmed - Kish Auto Detailing";
    case EMAIL_NOTIFICATION_TYPE.BOOKING_ON_THE_WAY:
      return "We're On Our Way! - Kish Auto Detailing";
    case EMAIL_NOTIFICATION_TYPE.BOOKING_COMPLETED:
      return "Service Complete - Kish Auto Detailing";
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
        <p>Hi ${booking.customer_name}, your auto detailing appointment has been confirmed. We look forward to seeing you!</p>
        <p><a href="${bookingLink}">View booking details</a></p>
      `;
    case EMAIL_NOTIFICATION_TYPE.BOOKING_ON_THE_WAY:
      return `
        <h2>We're on our way!</h2>
        <p>Hi ${booking.customer_name}, your Kish Auto Detailing team is heading to your location now.</p>
        <p>Please make sure your vehicle is accessible. See you soon!</p>
        <p><a href="${bookingLink}">View booking details</a></p>
      `;
    case EMAIL_NOTIFICATION_TYPE.BOOKING_COMPLETED:
      return `
        <h2>Service complete — thank you!</h2>
        <p>Hi ${booking.customer_name}, your auto detailing service has been completed. We hope your vehicle looks great!</p>
        <p>We'd love to have you back. Book your next appointment anytime.</p>
        <p><a href="${appUrl}/book">Book Again</a></p>
      `;
    case EMAIL_NOTIFICATION_TYPE.BOOKING_CANCELLED:
      return `
        <h2>Booking Cancelled</h2>
        <p>Hi ${booking.customer_name}, your booking has been cancelled.</p>
        <p>If this was a mistake, please book again at our website.</p>
        <p><a href="${appUrl}/book">Book Again</a></p>
      `;
    case EMAIL_NOTIFICATION_TYPE.BOOKING_DECLINED:
      return `
        <h2>Booking Update</h2>
        <p>Hi ${booking.customer_name}, unfortunately we're unable to accommodate your booking at the requested time.</p>
        <p>Please try booking a different time slot.</p>
        <p><a href="${appUrl}/book">Book Again</a></p>
      `;
    default:
      return `<p>Visit <a href="${bookingLink}">your booking</a> for details.</p>`;
  }
}
