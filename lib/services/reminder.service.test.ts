import {
  BOOKING_STATUS,
  EMAIL_NOTIFICATION_TYPE,
} from "@/lib/constants/booking";
import type { Booking } from "@/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFrom = vi.hoisted(() => vi.fn());
const mockSendBookingEmail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/services/email.service", () => ({
  sendBookingEmail: mockSendBookingEmail,
}));

import { sendDueAppointmentReminders } from "./reminder.service";

function makeBooking(
  overrides: Partial<Booking> & {
    slot?: { date: string; start_time: string } | null;
  } = {},
): Booking & { slot?: { date: string; start_time: string } | null } {
  return {
    id: "booking-1",
    reference_token: "550e8400-e29b-41d4-a716-446655440000",
    slot_id: "slot-1",
    customer_name: "Karl Marty",
    customer_email: "karl@example.com",
    customer_phone: "+639171234567",
    address_line1: "123 Main St",
    address_line2: null,
    city: "General Santos",
    notes: null,
    owner_notes: null,
    status: BOOKING_STATUS.CONFIRMED,
    privacy_notice_version: null,
    terms_version: null,
    customer_consent_at: null,
    transactional_contact_consent: true,
    environmental_ack_version: null,
    environmental_ack_at: null,
    vehicle_type: null,
    vehicle_details: null,
    parking_available: null,
    water_available: null,
    electric_available: null,
    access_instructions: null,
    site_safety_notes: null,
    completed_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    cancellation_policy_version: null,
    cancelled_by: null,
    declined_at: null,
    status_reason: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    slot: { date: "2026-07-02", start_time: "08:30:00" },
    ...overrides,
  };
}

function setupReminderQueries(
  bookings: ReturnType<typeof makeBooking>[],
  sentRows: Array<{ booking_id: string }> = [],
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "bookings") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({ data: bookings, error: null }),
            }),
          }),
        }),
      };
    }

    return {
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: sentRows, error: null }),
          }),
        }),
      }),
    };
  });
}

describe("sendDueAppointmentReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendBookingEmail.mockResolvedValue({ error: null });
  });

  it("sends booking_reminder emails for confirmed bookings due in the reminder window", async () => {
    setupReminderQueries([
      makeBooking({ id: "booking-due" }),
      makeBooking({
        id: "booking-later",
        slot: { date: "2026-07-02", start_time: "10:00:00" },
      }),
    ]);

    const result = await sendDueAppointmentReminders(
      new Date("2026-07-01T00:00:00Z"),
    );

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      checked: 1,
      skipped: 0,
      sent: 1,
      failed: 0,
    });
    expect(mockSendBookingEmail).toHaveBeenCalledWith({
      booking: expect.objectContaining({ id: "booking-due" }),
      type: EMAIL_NOTIFICATION_TYPE.BOOKING_REMINDER,
    });
  });

  it("skips bookings that already have a sent reminder audit row", async () => {
    setupReminderQueries([makeBooking({ id: "booking-due" })], [
      { booking_id: "booking-due" },
    ]);

    const result = await sendDueAppointmentReminders(
      new Date("2026-07-01T00:00:00Z"),
    );

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ checked: 1, skipped: 1, sent: 0 });
    expect(mockSendBookingEmail).not.toHaveBeenCalled();
  });
});
