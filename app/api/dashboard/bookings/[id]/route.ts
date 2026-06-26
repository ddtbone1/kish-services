import {
  BOOKING_STATUS,
  EMAIL_NOTIFICATION_TYPE,
  type BookingStatus,
} from "@/lib/constants/booking";
import { updateBookingStatus } from "@/lib/services/booking.service";
import { sendBookingEmail } from "@/lib/services/email.service";
import { createClient } from "@/lib/supabase/server";
import { updateBookingStatusSchema } from "@/lib/validations/booking";
import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";

const updateNotesSchema = z.object({
  action: z.literal("update_notes"),
  owner_notes: z.string().max(2000),
});

const updateStatusSchema = z.object({
  action: z.literal("update_status"),
  status: updateBookingStatusSchema.shape.status,
});

const patchBodySchema = z.discriminatedUnion("action", [
  updateNotesSchema,
  updateStatusSchema,
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.action === "update_status") {
      const { data, error } = await updateBookingStatus(
        id,
        parsed.data.status as BookingStatus,
      );
      if (error) return NextResponse.json({ error }, { status: 400 });

      // Notify the customer when the owner takes a visible action.
      // Fire-and-forget — don't delay the dashboard response for email I/O.
      if (data) {
        const STATUS_EMAIL_MAP: Partial<Record<BookingStatus, string>> = {
          [BOOKING_STATUS.CONFIRMED]: EMAIL_NOTIFICATION_TYPE.BOOKING_CONFIRMED,
          [BOOKING_STATUS.ON_THE_WAY]:
            EMAIL_NOTIFICATION_TYPE.BOOKING_ON_THE_WAY,
          [BOOKING_STATUS.COMPLETED]: EMAIL_NOTIFICATION_TYPE.BOOKING_COMPLETED,
          [BOOKING_STATUS.DECLINED]: EMAIL_NOTIFICATION_TYPE.BOOKING_DECLINED,
          [BOOKING_STATUS.CANCELLED]: EMAIL_NOTIFICATION_TYPE.BOOKING_CANCELLED,
        };
        const emailType = STATUS_EMAIL_MAP[parsed.data.status as BookingStatus];
        if (emailType) {
          sendBookingEmail({
            booking: data,
            type: emailType as (typeof EMAIL_NOTIFICATION_TYPE)[keyof typeof EMAIL_NOTIFICATION_TYPE],
          }).catch(console.error);
        }
      }

      // Invalidate the cached dashboard metrics so the next page load reflects
      // the new status counts without waiting for the 60-second TTL.
      revalidateTag("dashboard-metrics", "max");

      return NextResponse.json({ data });
    }

    // update_notes
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("bookings")
      .update({ owner_notes: parsed.data.owner_notes, updated_at: now })
      .eq("id", id)
      .select("id, owner_notes, updated_at")
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
