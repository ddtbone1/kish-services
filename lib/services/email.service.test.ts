// Feature: Email
// Purpose: Unit tests for sendAdminNotification in email service
// Added: 2026-05-22

import {
  BOOKING_STATUS,
  EMAIL_NOTIFICATION_TYPE,
} from "@/lib/constants/booking";
import type { Booking } from "@/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Use vi.hoisted so these are available when vi.mock factories are evaluated
const mockSendMail = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockLogBookingEvent = vi.hoisted(() => vi.fn());

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  requestContext: { getStore: vi.fn() },
}));

vi.mock("@/lib/services/booking-events.service", () => ({
  BOOKING_EVENT_TYPE: {
    EMAIL_RECORDED: "email_recorded",
  },
  logBookingEvent: mockLogBookingEvent,
}));

// Import after mocks are set up
import {
  processDueEmailRetries,
  sendAdminNotification,
  sendBookingEmail,
  sendChatEscalationNotification,
} from "./email.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env };

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-123",
    reference_token: "tok-abc",
    slot_id: "slot-1",
    customer_name: "Jane Smith",
    customer_email: "jane@example.com",
    customer_phone: null,
    address_line1: "123 Main St",
    address_line2: null,
    city: "Manila",
    notes: null,
    owner_notes: null,
    status: BOOKING_STATUS.PENDING,
    privacy_notice_version: null,
    terms_version: null,
    customer_consent_at: null,
    transactional_contact_consent: false,
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
    created_at: "2026-05-22T10:00:00Z",
    updated_at: "2026-05-22T10:00:00Z",
    ...overrides,
  };
}

// ─── sendAdminNotification ────────────────────────────────────────────────────

describe("sendAdminNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: admin email is set
    process.env.ADMIN_EMAIL = "owner@kishautodetailing.com";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    // Mock the audit log insert to succeed
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });
  });

  afterEach(() => {
    // Restore env
    Object.keys(process.env).forEach((k) => {
      if (!(k in ORIGINAL_ENV)) delete process.env[k];
    });
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("sends email to ADMIN_EMAIL with booking details", async () => {
    mockSendMail.mockResolvedValue({});

    const booking = makeBooking();
    const result = await sendAdminNotification(booking);

    expect(result.error).toBeNull();
    expect(mockSendMail).toHaveBeenCalledOnce();

    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.to).toBe("owner@kishautodetailing.com");
    expect(callArgs.subject).toContain("Jane Smith");
    expect(callArgs.html).toContain("booking-123"); // dashboard link contains booking id
  });

  it("includes the dashboard link in the email body", async () => {
    mockSendMail.mockResolvedValue({});

    const booking = makeBooking();
    await sendAdminNotification(booking);

    const html = mockSendMail.mock.calls[0][0].html as string;
    expect(html).toContain("/dashboard/bookings/booking-123");
  });

  it("logs the notification to email_notifications table", async () => {
    mockSendMail.mockResolvedValue({});

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await sendAdminNotification(makeBooking());

    expect(mockFrom).toHaveBeenCalledWith("email_notifications");
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.recipient_email).toBe("owner@kishautodetailing.com");
    expect(insertArg.type).toBe("admin_booking_alert");
    expect(insertArg.status).toBe("sent");
  });

  it("logs status=failed when nodemailer throws", async () => {
    // Use fake timers so the retry delays (1s, 4s, 16s) complete instantly
    vi.useFakeTimers();
    mockSendMail.mockRejectedValue(new Error("connection refused"));

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const promise = sendAdminNotification(makeBooking());
    await vi.runAllTimersAsync();
    const result = await promise;

    vi.useRealTimers();

    expect(result.error).toBe("connection refused");
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.status).toBe("failed");
    expect(insertArg.error_message).toBe("connection refused");
    expect(insertArg.next_retry_at).toEqual(expect.any(String));
  });

  it("returns no error and skips send when ADMIN_EMAIL is not set", async () => {
    delete process.env.ADMIN_EMAIL;

    const result = await sendAdminNotification(makeBooking());

    expect(result.error).toBeNull();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("returns error and logs failure when nodemailer throws", async () => {
    // Use fake timers so the retry delays (1s, 4s, 16s) complete instantly
    vi.useFakeTimers();
    mockSendMail.mockRejectedValue(new Error("network timeout"));

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const promise = sendAdminNotification(makeBooking());
    await vi.runAllTimersAsync();
    const result = await promise;

    vi.useRealTimers();

    expect(result.error).toBe("network timeout");
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.status).toBe("failed");
    expect(insertArg.error_message).toBe("network timeout");
    expect(insertArg.next_retry_at).toEqual(expect.any(String));
  });
});

describe("sendBookingEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });
  });

  afterEach(() => {
    Object.keys(process.env).forEach((k) => {
      if (!(k in ORIGINAL_ENV)) delete process.env[k];
    });
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("renders the appointment reminder email with booking slot context", async () => {
    mockSendMail.mockResolvedValue({});

    await sendBookingEmail({
      booking: {
        ...makeBooking({ status: BOOKING_STATUS.CONFIRMED }),
        slot: { date: "2026-07-02", start_time: "08:30:00" },
      },
      type: EMAIL_NOTIFICATION_TYPE.BOOKING_REMINDER,
    });

    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.subject).toBe("Appointment Reminder - Kish Auto Detailing");
    expect(callArgs.html).toContain("Appointment Reminder");
    expect(callArgs.html).toContain("Thursday, July 2");
  });
});

describe("processDueEmailRetries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  afterEach(() => {
    Object.keys(process.env).forEach((k) => {
      if (!(k in ORIGINAL_ENV)) delete process.env[k];
    });
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("claims a due failed notification, resends it, and marks the same row sent", async () => {
    mockSendMail.mockResolvedValue({});
    const updates: Record<string, unknown>[] = [];
    const row = {
      id: "email-1",
      booking_id: "booking-123",
      recipient_email: "jane@example.com",
      type: EMAIL_NOTIFICATION_TYPE.BOOKING_CONFIRMATION,
      retry_count: 3,
      booking: makeBooking(),
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({
                        data: [row],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      return {
        update: vi.fn((payload) => {
          updates.push(payload);
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "email-1" },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }),
      };
    });

    const result = await processDueEmailRetries();

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ checked: 1, claimed: 1, sent: 1 });
    expect(updates[0]).toMatchObject({ status: "pending" });
    expect(updates[1]).toMatchObject({
      status: "sent",
      retry_count: 4,
      next_retry_at: null,
    });
  });
});

describe("sendChatEscalationNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAIL = "owner@kishautodetailing.com";
  });

  afterEach(() => {
    Object.keys(process.env).forEach((k) => {
      if (!(k in ORIGINAL_ENV)) delete process.env[k];
    });
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("emails the owner with escaped escalation details", async () => {
    mockSendMail.mockResolvedValue({});

    const result = await sendChatEscalationNotification({
      sessionId: "session-1",
      question: "<script>alert('x')</script>",
      answer: "Owner should review.",
    });

    expect(result.error).toBeNull();
    expect(mockSendMail).toHaveBeenCalledOnce();
    const mail = mockSendMail.mock.calls[0][0];
    expect(mail.to).toBe("owner@kishautodetailing.com");
    expect(mail.subject).toBe("Chat Escalation - Kish Auto Detailing");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).not.toContain("<script>");
  });

  it("skips sending when ADMIN_EMAIL is not configured", async () => {
    delete process.env.ADMIN_EMAIL;

    const result = await sendChatEscalationNotification({
      sessionId: "session-1",
      question: "Question",
      answer: "Answer",
    });

    expect(result.error).toBeNull();
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
