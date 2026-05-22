import { EMAIL_NOTIFICATION_TYPE } from "@/lib/constants/booking";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createBooking } from "@/lib/services/booking.service";
import {
  sendAdminNotification,
  sendBookingEmail,
} from "@/lib/services/email.service";
import { createBookingSchema } from "@/lib/validations/booking";
import type { Booking } from "@/types";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { limited, retryAfter } = checkRateLimit(
    ip,
    "bookings",
    5,
    60 * 60 * 1000,
  );
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  try {
    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { data, error } = await createBooking(parsed.data);

    if (error || !data) {
      return NextResponse.json(
        { error: error ?? "Failed to create booking" },
        { status: 500 },
      );
    }

    // Send confirmation email to customer (fire-and-forget — don't block response)
    const bookingForEmail: Booking = { ...data, owner_notes: null };
    sendBookingEmail({
      booking: bookingForEmail,
      type: EMAIL_NOTIFICATION_TYPE.BOOKING_CONFIRMATION,
    }).catch(console.error);

    // Alert the owner about the new booking (fire-and-forget)
    sendAdminNotification(bookingForEmail).catch(console.error);

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
