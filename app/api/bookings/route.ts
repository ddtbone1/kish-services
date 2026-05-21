import { EMAIL_NOTIFICATION_TYPE } from "@/lib/constants/booking";
import { createBooking } from "@/lib/services/booking.service";
import { sendBookingEmail } from "@/lib/services/email.service";
import { createBookingSchema } from "@/lib/validations/booking";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
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

    // Send confirmation email (fire-and-forget — don't block response)
    sendBookingEmail({
      booking: { ...data, owner_notes: null } as any,
      type: EMAIL_NOTIFICATION_TYPE.BOOKING_CONFIRMATION,
    }).catch(console.error);

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
