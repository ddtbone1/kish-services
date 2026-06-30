import {
  checkIdempotencyKey,
  hashBody,
  storeIdempotencyKey,
} from "@/lib/idempotency";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assessBookingRisk, createBooking } from "@/lib/services/booking.service";
import {
  BOOKING_EVENT_TYPE,
  logBookingEvent,
} from "@/lib/services/booking-events.service";
import { sendAdminNotification } from "@/lib/services/email.service";
import { getSlotDateById } from "@/lib/services/availability.service";
import { withRequestContext } from "@/lib/utils/with-request-context";
import { createBookingSchema } from "@/lib/validations/booking";
import type { Booking } from "@/types";
import { NextResponse, after, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  return withRequestContext(request, async () => {
    const ip = getClientIp(request);
    const { limited, retryAfter } = await checkRateLimit(
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
      // Read body as text first so we can hash the raw bytes for idempotency.
      const rawBody = await request.text();
      const bodyHash = hashBody(rawBody);

      const idempotencyKey = request.headers.get("idempotency-key");
      if (idempotencyKey) {
        const idempotencyResult = await checkIdempotencyKey(
          idempotencyKey,
          bodyHash,
        );

        if (idempotencyResult.status === "replay") {
          logger.info("Idempotency replay", { key: idempotencyKey });
          return NextResponse.json(
            idempotencyResult.record.response_body,
            { status: idempotencyResult.record.status_code },
          );
        }

        if (idempotencyResult.status === "hash_mismatch") {
          return NextResponse.json(
            {
              error:
                "Idempotency-Key has already been used with a different request body.",
            },
            { status: 422 },
          );
        }

        if (idempotencyResult.status === "error") {
          logger.error("Idempotency check DB error", {
            error: idempotencyResult.error,
          });
          return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
          );
        }
      }

      // Parse and validate the body
      let body: unknown;
      try {
        body = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 },
        );
      }

      const parsed = createBookingSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const { data, error, code } = await createBooking(parsed.data);

      if (error || !data) {
        // 409 when the chosen slot is no longer available (taken/blocked/past),
        // 422 when the selected services are invalid, else 500.
        const status =
          code === "conflict" ? 409 : code === "invalid" ? 422 : 500;
        return NextResponse.json(
          { error: error ?? "Failed to create booking" },
          { status },
        );
      }

      const responseBody = { data };

      await logBookingEvent({
        bookingId: data.id,
        eventType: BOOKING_EVENT_TYPE.BOOKING_CREATED,
        actorType: "customer",
        source: "public_booking_form",
        payload: {
          service_count: parsed.data.service_ids.length,
        },
      });

      const riskFlags = assessBookingRisk(parsed.data);
      if (riskFlags.length > 0) {
        await logBookingEvent({
          bookingId: data.id,
          eventType: BOOKING_EVENT_TYPE.RISK_FLAGGED,
          actorType: "system",
          source: "booking_risk_rules",
          payload: {
            flags: riskFlags,
          },
        });
      }

      // Store the idempotency key so replays get the cached response.
      if (idempotencyKey) {
        await storeIdempotencyKey(idempotencyKey, bodyHash, responseBody, 201);
      }

      // Keep availability consumers fresh. Public single-date reads are no-store,
      // but admin/generated views may still carry availability tags.
      revalidateTag("availability", "max");
      const { data: bookedDate, error: bookedDateError } =
        await getSlotDateById(data.slot_id);
      if (bookedDate) {
        revalidateTag(`availability-${bookedDate}`, "max");
      } else if (bookedDateError) {
        logger.warn("Could not revalidate date-specific availability", {
          slotId: data.slot_id,
          error: bookedDateError,
        });
      }

      // Alert the owner about the new booking (fire-and-forget).
      // Customer email is deferred — sent by the owner's status-change action
      // (BOOKING_CONFIRMED, BOOKING_DECLINED, etc.) so the customer only hears
      // once the booking has been reviewed, not immediately on submission.
      const bookingForEmail: Booking = { ...data, owner_notes: null };
      // Defer with after() so the SMTP send + retry backoff completes on
      // serverless instead of being cut off when the function suspends.
      after(async () => {
        try {
          await sendAdminNotification(bookingForEmail);
        } catch (err) {
          logger.error("sendAdminNotification fire-and-forget failed", {
            error: String(err),
          });
        }
      });

      return NextResponse.json(responseBody, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}
