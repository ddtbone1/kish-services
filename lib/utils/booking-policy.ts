import {
  canCustomerCancel,
  type BookingStatus,
} from "@/lib/constants/booking";
import { CANCELLATION_POLICY } from "@/lib/constants/policy";

const MANILA_OFFSET = "+08:00";

export interface BookingPolicySlot {
  date: string;
  start_time: string;
}

export function getCancellationCutoffInstant(slot: BookingPolicySlot): Date {
  const startAt = new Date(`${slot.date}T${slot.start_time}${MANILA_OFFSET}`);
  return new Date(
    startAt.getTime() - CANCELLATION_POLICY.cutoffHours * 60 * 60 * 1000,
  );
}

export function canCustomerCancelBooking(
  status: BookingStatus,
  slot: BookingPolicySlot | null,
  now: Date = new Date(),
): boolean {
  if (!canCustomerCancel(status) || !slot) return false;
  return now < getCancellationCutoffInstant(slot);
}
