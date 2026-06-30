import {
  cancelBookingByToken,
  getBookingByToken,
} from "@/lib/services/booking.service";
import {
  BOOKING_EVENT_TYPE,
  logBookingEvent,
} from "@/lib/services/booking-events.service";
import { cancelBookingSchema } from "@/lib/validations/booking";
import { NextResponse, type NextRequest } from "next/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!UUID_REGEX.test(token)) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { data, error } = await getBookingByToken(token);

  if (error || !data) {
    return NextResponse.json(
      { error: error ?? "Booking not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!UUID_REGEX.test(token)) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = cancelBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { data, error } = await cancelBookingByToken(
      token,
      parsed.data.reason,
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (data) {
      await logBookingEvent({
        bookingId: data.id,
        eventType: BOOKING_EVENT_TYPE.CUSTOMER_CANCELLED,
        actorType: "customer",
        source: "public_booking_page",
        payload: { reason_provided: true },
      });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
