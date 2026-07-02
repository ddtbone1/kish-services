import {
  EMAIL_NOTIFICATION_TYPE,
  EMAIL_STATUS,
  type EmailNotificationType,
} from "@/lib/constants/booking";
import { SITE_REQUIREMENTS } from "@/lib/constants/policy";
import { logger } from "@/lib/logger";
import {
  BOOKING_EVENT_TYPE,
  logBookingEvent,
} from "@/lib/services/booking-events.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/utils/app-url";
import type { Booking } from "@/types";
import nodemailer, { type SendMailOptions } from "nodemailer";

type EmailBooking = Booking & {
  slot?: { date: string; start_time: string } | null;
};

interface SendEmailParams {
  booking: EmailBooking;
  type: EmailNotificationType;
}

interface SendAndRecordParams {
  booking: EmailBooking;
  type: EmailNotificationType;
  recipientEmail: string;
}

interface SendEmailOnlyParams extends SendAndRecordParams {
  source: "email_service" | "email_retry_job";
}

interface SendChatEscalationParams {
  sessionId: string;
  question: string;
  answer: string;
}

interface EmailRetryRow {
  id: string;
  booking_id: string;
  recipient_email: string;
  type: EmailNotificationType;
  retry_count: number;
  booking: EmailBooking | EmailBooking[] | null;
}

export interface EmailRetryRunResult {
  checked: number;
  claimed: number;
  sent: number;
  failed: number;
  exhausted: number;
  skipped: number;
}

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

// Immediate retry delays: 1 s, 4 s, 16 s. Initial try + these retries = 4
// SMTP attempts before the message is handed to the background retry job.
const RETRY_DELAYS_MS = [1_000, 4_000, 16_000];
const BACKGROUND_RETRY_DELAYS_MS = [
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  6 * 60 * 60_000,
  24 * 60 * 60_000,
];
const MAX_EMAIL_RETRY_COUNT =
  RETRY_DELAYS_MS.length + BACKGROUND_RETRY_DELAYS_MS.length;

async function sendWithRetry(mailOptions: SendMailOptions): Promise<number> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      await createTransporter().sendMail(mailOptions);
      return attempt;
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

export async function sendBookingEmail({
  booking,
  type,
}: SendEmailParams): Promise<{ error: string | null }> {
  return sendAndRecordEmail({
    booking,
    type,
    recipientEmail: booking.customer_email,
  });
}

export async function sendAdminNotification(
  booking: Booking,
): Promise<{ error: string | null }> {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.warn(
      "[email.service] ADMIN_EMAIL is not set - skipping admin notification",
    );
    return { error: null };
  }

  return sendAndRecordEmail({
    booking,
    type: EMAIL_NOTIFICATION_TYPE.ADMIN_BOOKING_ALERT,
    recipientEmail: adminEmail,
  });
}

export async function sendChatEscalationNotification({
  sessionId,
  question,
  answer,
}: SendChatEscalationParams): Promise<{ error: string | null }> {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.warn(
      "[email.service] ADMIN_EMAIL is not set - skipping chat escalation notification",
    );
    return { error: null };
  }

  let errorMessage: string | null = null;

  try {
    await sendWithRetry({
      from: FROM_ADDRESS,
      to: adminEmail,
      subject: "Chat Escalation - Kish Auto Detailing",
      html: getChatEscalationBody({ sessionId, question, answer }),
    });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown email error";
    logger.error("sendChatEscalationNotification failed after retries", {
      sessionId,
      error: errorMessage,
    });
  }

  return { error: errorMessage };
}

export async function processDueEmailRetries(
  limit = 10,
): Promise<{ data: EmailRetryRunResult | null; error: string | null }> {
  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  const { data, error } = await admin
    .from("email_notifications")
    .select("id, booking_id, recipient_email, type, retry_count, booking:bookings(*)")
    .eq("status", EMAIL_STATUS.FAILED)
    .not("next_retry_at", "is", null)
    .lte("next_retry_at", nowIso)
    .lt("retry_count", MAX_EMAIL_RETRY_COUNT)
    .order("next_retry_at", { ascending: true })
    .limit(limit);

  if (error) return { data: null, error: error.message };

  const rows = (data ?? []) as EmailRetryRow[];
  const result: EmailRetryRunResult = {
    checked: rows.length,
    claimed: 0,
    sent: 0,
    failed: 0,
    exhausted: 0,
    skipped: 0,
  };

  for (const row of rows) {
    const claim = await admin
      .from("email_notifications")
      .update({ status: EMAIL_STATUS.PENDING })
      .eq("id", row.id)
      .eq("status", EMAIL_STATUS.FAILED)
      .select("id")
      .single();

    if (claim.error || !claim.data) {
      result.skipped++;
      continue;
    }

    result.claimed++;

    const booking = normalizeJoinedBooking(row.booking);
    if (!booking) {
      await markRetryFailed(admin, row, "Booking not found", now);
      result.failed++;
      continue;
    }

    const delivery = await sendEmailOnly({
      booking,
      type: row.type,
      recipientEmail: row.recipient_email,
      source: "email_retry_job",
    });
    const nextRetryCount = row.retry_count + 1;

    if (!delivery.error) {
      await admin
        .from("email_notifications")
        .update({
          status: EMAIL_STATUS.SENT,
          error_message: null,
          retry_count: nextRetryCount,
          next_retry_at: null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      result.sent++;
      continue;
    }

    const exhausted = nextRetryCount >= MAX_EMAIL_RETRY_COUNT;
    await admin
      .from("email_notifications")
      .update({
        status: EMAIL_STATUS.FAILED,
        error_message: delivery.error,
        retry_count: nextRetryCount,
        next_retry_at: exhausted
          ? null
          : getNextRetryAt(nextRetryCount, now).toISOString(),
      })
      .eq("id", row.id);

    if (exhausted) result.exhausted++;
    else result.failed++;
  }

  return { data: result, error: null };
}

async function sendAndRecordEmail({
  booking,
  type,
  recipientEmail,
}: SendAndRecordParams): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const delivery = await sendEmailOnly({
    booking,
    type,
    recipientEmail,
    source: "email_service",
  });

  await admin.from("email_notifications").insert({
    booking_id: booking.id,
    recipient_email: recipientEmail,
    type,
    provider_message_id: null,
    status: delivery.error ? EMAIL_STATUS.FAILED : EMAIL_STATUS.SENT,
    error_message: delivery.error,
    retry_count: delivery.retryCount,
    next_retry_at: delivery.error
      ? getNextRetryAt(delivery.retryCount, new Date()).toISOString()
      : null,
    sent_at: new Date().toISOString(),
  });

  return { error: delivery.error };
}

async function sendEmailOnly({
  booking,
  type,
  recipientEmail,
  source,
}: SendEmailOnlyParams): Promise<{
  error: string | null;
  retryCount: number;
}> {
  const { subject, html } = getMailContent(booking, type);

  let retryCount = 0;
  let errorMessage: string | null = null;

  try {
    retryCount = await sendWithRetry({
      from: FROM_ADDRESS,
      to: recipientEmail,
      subject,
      html,
    });
  } catch (err) {
    retryCount = RETRY_DELAYS_MS.length;
    errorMessage = err instanceof Error ? err.message : "Unknown email error";
    logger.error(`${source} failed after retries`, {
      type,
      bookingId: booking.id,
      error: errorMessage,
    });
  }

  await logBookingEvent({
    bookingId: booking.id,
    eventType: BOOKING_EVENT_TYPE.EMAIL_RECORDED,
    actorType: "system",
    source,
    payload: {
      type,
      status: errorMessage ? EMAIL_STATUS.FAILED : EMAIL_STATUS.SENT,
      retry_count: retryCount,
    },
  });

  return { error: errorMessage, retryCount };
}

async function markRetryFailed(
  admin: ReturnType<typeof createAdminClient>,
  row: EmailRetryRow,
  errorMessage: string,
  now: Date,
) {
  const nextRetryCount = row.retry_count + 1;
  const exhausted = nextRetryCount >= MAX_EMAIL_RETRY_COUNT;
  await admin
    .from("email_notifications")
    .update({
      status: EMAIL_STATUS.FAILED,
      error_message: errorMessage,
      retry_count: nextRetryCount,
      next_retry_at: exhausted
        ? null
        : getNextRetryAt(nextRetryCount, now).toISOString(),
    })
    .eq("id", row.id);
}

function getNextRetryAt(retryCount: number, now: Date): Date {
  const backgroundAttempt = Math.max(0, retryCount - RETRY_DELAYS_MS.length);
  const delay =
    BACKGROUND_RETRY_DELAYS_MS[
      Math.min(backgroundAttempt, BACKGROUND_RETRY_DELAYS_MS.length - 1)
    ];
  return new Date(now.getTime() + delay);
}

function normalizeJoinedBooking(
  booking: EmailRetryRow["booking"],
): EmailBooking | null {
  if (!booking) return null;
  return Array.isArray(booking) ? (booking[0] ?? null) : booking;
}

function getMailContent(
  booking: EmailBooking,
  type: EmailNotificationType,
): { subject: string; html: string } {
  if (type === EMAIL_NOTIFICATION_TYPE.ADMIN_BOOKING_ALERT) {
    return {
      subject: `New Booking - ${booking.customer_name}`,
      html: getAdminNotificationBody(booking),
    };
  }

  return {
    subject: getSubjectForType(type),
    html: getBodyForType(booking, type),
  };
}

function getAdminNotificationBody(booking: EmailBooking): string {
  const appUrl = getAppUrl();
  const dashboardLink = `${appUrl}/dashboard/bookings/${booking.id}`;

  return `
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
}

function getChatEscalationBody({
  sessionId,
  question,
  answer,
}: SendChatEscalationParams): string {
  return `
    <h2>Chat escalation received</h2>
    <table style="border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Session</td><td>${escapeHtml(sessionId)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Customer question</td><td>${escapeHtml(question)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Assistant answer</td><td>${escapeHtml(answer)}</td></tr>
    </table>
    <p style="margin-top:16px;">Review the chat_sessions table or dashboard inbox when available.</p>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

function getBodyForType(
  booking: EmailBooking,
  type: EmailNotificationType,
): string {
  const appUrl = getAppUrl();
  const bookingLink = `${appUrl}/booking/${booking.reference_token}`;
  const appointmentLabel = getAppointmentLabel(booking);
  const siteFooter = `
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
    <p><strong>Site and environmental reminder</strong></p>
    <p>${SITE_REQUIREMENTS.safeWorkArea}</p>
    <p>${SITE_REQUIREMENTS.runoffResponsibility}</p>
    <p>If the location is unsafe or unsuitable for runoff/wastewater handling, the booking may need to be declined or rescheduled.</p>
  `;

  switch (type) {
    case EMAIL_NOTIFICATION_TYPE.BOOKING_CONFIRMATION:
      return `
        <h2>Thanks for your booking, ${booking.customer_name}!</h2>
        <p>We've received your booking request and will confirm it shortly.</p>
        <p><a href="${bookingLink}">View or manage your booking</a></p>
        ${siteFooter}
      `;
    case EMAIL_NOTIFICATION_TYPE.BOOKING_CONFIRMED:
      return `
        <h2>Your booking is confirmed!</h2>
        <p>Hi ${booking.customer_name}, your auto detailing appointment has been confirmed. We look forward to seeing you!</p>
        <p><a href="${bookingLink}">View booking details</a></p>
        ${siteFooter}
      `;
    case EMAIL_NOTIFICATION_TYPE.BOOKING_ON_THE_WAY:
      return `
        <h2>We're on our way!</h2>
        <p>Hi ${booking.customer_name}, your Kish Auto Detailing team is heading to your location now.</p>
        <p>Please make sure your vehicle is accessible. See you soon!</p>
        <p><a href="${bookingLink}">View booking details</a></p>
        ${siteFooter}
      `;
    case EMAIL_NOTIFICATION_TYPE.BOOKING_COMPLETED:
      return `
        <h2>Service complete - thank you!</h2>
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
    case EMAIL_NOTIFICATION_TYPE.BOOKING_REMINDER:
      return `
        <h2>Appointment Reminder</h2>
        <p>Hi ${booking.customer_name}, this is a reminder for your Kish Auto Detailing appointment${appointmentLabel ? ` on ${appointmentLabel}` : ""}.</p>
        <p>Please make sure your vehicle is accessible and the work area is ready.</p>
        <p><a href="${bookingLink}">View booking details</a></p>
        ${siteFooter}
      `;
    default:
      return `<p>Visit <a href="${bookingLink}">your booking</a> for details.</p>`;
  }
}

function getAppointmentLabel(booking: EmailBooking): string | null {
  if (!booking.slot) return null;

  const at = new Date(`${booking.slot.date}T${booking.slot.start_time}+08:00`);
  return at.toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
