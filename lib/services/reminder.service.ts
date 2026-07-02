import {
  BOOKING_STATUS,
  EMAIL_NOTIFICATION_TYPE,
  EMAIL_STATUS,
} from "@/lib/constants/booking";
import { sendBookingEmail } from "@/lib/services/email.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { manilaTodayDate } from "@/lib/utils/timezone";
import type { Booking } from "@/types";

const REMINDER_LEAD_HOURS = 24;
const REMINDER_WINDOW_MINUTES = 90;
const MANILA_OFFSET = "+08:00";

type ReminderBooking = Booking & {
  slot: { date: string; start_time: string } | null;
};

export interface ReminderRunResult {
  checked: number;
  skipped: number;
  sent: number;
  failed: number;
}

export async function sendDueAppointmentReminders(
  now: Date = new Date(),
): Promise<{ data: ReminderRunResult | null; error: string | null }> {
  const admin = createAdminClient();
  const windowStart = new Date(
    now.getTime() + REMINDER_LEAD_HOURS * 60 * 60 * 1000,
  );
  const windowEnd = new Date(
    windowStart.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000,
  );

  const { data, error } = await admin
    .from("bookings")
    .select("*, slot:availability_slots!inner(date, start_time)")
    .eq("status", BOOKING_STATUS.CONFIRMED)
    .gte("availability_slots.date", manilaTodayDate(windowStart))
    .lte("availability_slots.date", manilaTodayDate(windowEnd));

  if (error) return { data: null, error: error.message };

  const dueBookings = ((data ?? []) as ReminderBooking[]).filter((booking) => {
    if (!booking.slot) return false;
    const startsAt = new Date(
      `${booking.slot.date}T${booking.slot.start_time}${MANILA_OFFSET}`,
    );
    return startsAt >= windowStart && startsAt < windowEnd;
  });

  if (dueBookings.length === 0) {
    return {
      data: { checked: 0, skipped: 0, sent: 0, failed: 0 },
      error: null,
    };
  }

  const { data: existingReminderRows, error: existingReminderRowsError } =
    await admin
    .from("email_notifications")
    .select("booking_id")
    .in(
      "booking_id",
      dueBookings.map((booking) => booking.id),
    )
    .eq("type", EMAIL_NOTIFICATION_TYPE.BOOKING_REMINDER)
    .in("status", [EMAIL_STATUS.SENT, EMAIL_STATUS.FAILED, EMAIL_STATUS.PENDING]);

  if (existingReminderRowsError) {
    return { data: null, error: existingReminderRowsError.message };
  }

  const alreadyQueued = new Set(
    (existingReminderRows ?? []).map((row) => row.booking_id as string),
  );

  let sent = 0;
  let failed = 0;

  for (const booking of dueBookings) {
    if (alreadyQueued.has(booking.id)) continue;

    const result = await sendBookingEmail({
      booking,
      type: EMAIL_NOTIFICATION_TYPE.BOOKING_REMINDER,
    });
    if (result.error) failed++;
    else sent++;
  }

  return {
    data: {
      checked: dueBookings.length,
      skipped: alreadyQueued.size,
      sent,
      failed,
    },
    error: null,
  };
}
