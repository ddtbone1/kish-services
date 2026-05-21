export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  ON_THE_WAY: "on_the_way",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DECLINED: "declined",
} as const;

export type BookingStatus =
  (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const BOOKING_STATUS_VALUES = Object.values(BOOKING_STATUS) as [
  BookingStatus,
  ...BookingStatus[],
];

/**
 * Valid state transitions: current status → allowed next statuses.
 * Used by the service layer to enforce business rules.
 */
export const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> =
  {
    [BOOKING_STATUS.PENDING]: [
      BOOKING_STATUS.CONFIRMED,
      BOOKING_STATUS.DECLINED,
      BOOKING_STATUS.CANCELLED,
    ],
    [BOOKING_STATUS.CONFIRMED]: [
      BOOKING_STATUS.ON_THE_WAY,
      BOOKING_STATUS.CANCELLED,
    ],
    [BOOKING_STATUS.ON_THE_WAY]: [BOOKING_STATUS.COMPLETED],
    [BOOKING_STATUS.COMPLETED]: [],
    [BOOKING_STATUS.CANCELLED]: [],
    [BOOKING_STATUS.DECLINED]: [],
  };

export const EMAIL_NOTIFICATION_TYPE = {
  BOOKING_CONFIRMATION: "booking_confirmation",
  BOOKING_CONFIRMED: "booking_confirmed",
  BOOKING_CANCELLED: "booking_cancelled",
  BOOKING_DECLINED: "booking_declined",
  BOOKING_REMINDER: "booking_reminder",
} as const;

export type EmailNotificationType =
  (typeof EMAIL_NOTIFICATION_TYPE)[keyof typeof EMAIL_NOTIFICATION_TYPE];

export const EMAIL_NOTIFICATION_TYPE_VALUES = Object.values(
  EMAIL_NOTIFICATION_TYPE,
) as [EmailNotificationType, ...EmailNotificationType[]];

export const EMAIL_STATUS = {
  SENT: "sent",
  FAILED: "failed",
  BOUNCED: "bounced",
} as const;

export type EmailStatus = (typeof EMAIL_STATUS)[keyof typeof EMAIL_STATUS];
