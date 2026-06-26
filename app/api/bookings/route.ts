import {
  checkIdempotencyKey,
  hashBody,
  storeIdempotencyKey,
} from "@/lib/idempotency";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createBooking } from "@/lib/services/booking.service";
import { sendAdminNotification } from "@/lib/services/email.service";
import { withRequestContext } from "@/lib/utils/with-request-context";
import { createBookingSchema } from "@/lib/validations/booking";
import type { Booking } from "@/types";
import { NextResponse, type NextRequest } from "next/server";
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
        // 422 when the selected services/add-ons are invalid, else 500.
        const status =
          code === "conflict" ? 409 : code === "invalid" ? 422 : 500;
        return NextResponse.json(
          { error: error ?? "Failed to create booking" },
          { status },
        );
      }

      const responseBody = { data };

      // Store the idempotency key so replays get the cached response.
      if (idempotencyKey) {
        await storeIdempotencyKey(idempotencyKey, bodyHash, responseBody, 201);
      }

      // The booking service returns the booking row, not the joined slot row.
      // Date-specific availability caches also carry the shared availability tag.
      revalidateTag("availability", "max");

      // Alert the owner about the new booking (fire-and-forget).
      // Customer email is deferred — sent by the owner's status-change action
      // (BOOKING_CONFIRMED, BOOKING_DECLINED, etc.) so the customer only hears
      // once the booking has been reviewed, not immediately on submission.
      const bookingForEmail: Booking = { ...data, owner_notes: null };
      sendAdminNotification(bookingForEmail).catch((err) =>
        logger.error("sendAdminNotification fire-and-forget failed", {
          error: String(err),
        }),
      );

      return NextResponse.json(responseBody, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}
