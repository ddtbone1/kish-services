// Feature: Booking Validations
// Purpose: Unit tests for Zod schemas in lib/validations/booking.ts
// Added: 2026-05-22

import { describe, expect, it } from "vitest";
import {
  cancelBookingSchema,
  createBookingSchema,
  updateBookingStatusSchema,
} from "./booking";

// ─── cancelBookingSchema ──────────────────────────────────────────────────────

describe("cancelBookingSchema", () => {
  it("passes for cancel with a reason", () => {
    const result = cancelBookingSchema.safeParse({
      action: "cancel",
      reason: "Schedule changed",
    });
    expect(result.success).toBe(true);
  });

  it("fails when action or reason is missing", () => {
    const result = cancelBookingSchema.safeParse({ action: "cancel" });
    expect(result.success).toBe(false);
  });

  it("fails when action is an unknown value", () => {
    const result = cancelBookingSchema.safeParse({ action: "approve" });
    expect(result.success).toBe(false);
  });

  it("fails when action is null", () => {
    const result = cancelBookingSchema.safeParse({ action: null });
    expect(result.success).toBe(false);
  });
});

// ─── updateBookingStatusSchema ────────────────────────────────────────────────

describe("updateBookingStatusSchema", () => {
  const VALID_STATUSES = [
    "pending",
    "confirmed",
    "on_the_way",
    "completed",
    "cancelled",
    "declined",
  ];

  it.each(VALID_STATUSES)("passes for status '%s'", (status) => {
    const result = updateBookingStatusSchema.safeParse({ status });
    expect(result.success).toBe(true);
  });

  it("fails for an unknown status", () => {
    const result = updateBookingStatusSchema.safeParse({
      status: "in_progress",
    });
    expect(result.success).toBe(false);
  });

  it("fails when status is missing", () => {
    const result = updateBookingStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── createBookingSchema ──────────────────────────────────────────────────────

describe("createBookingSchema", () => {
  const VALID_INPUT = {
    slot_id: "550e8400-e29b-41d4-a716-446655440000",
    service_ids: ["660e8400-e29b-41d4-a716-446655440000"],
    customer_name: "Karl Marty",
    customer_email: "karl@example.com",
    customer_phone: "0917 123 4567",
    address_line1: "123 Main St",
    city: "General Santos",
    // Consent + required site fields (Phase 2/3)
    accept_terms_privacy: true,
    environmental_acknowledgement: true,
    vehicle_type: "sedan",
    parking_available: true,
  };

  it("passes for a valid booking input", () => {
    const result = createBookingSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
  });

  it("fails when consent (accept_terms_privacy) is not true", () => {
    for (const value of [false, undefined]) {
      const result = createBookingSchema.safeParse({
        ...VALID_INPUT,
        accept_terms_privacy: value,
      });
      expect(result.success).toBe(false);
    }
  });

  it("fails when vehicle_type is missing or unknown", () => {
    for (const vehicle_type of [undefined, "spaceship"]) {
      const result = createBookingSchema.safeParse({
        ...VALID_INPUT,
        vehicle_type,
      });
      expect(result.success).toBe(false);
    }
  });

  it("requires vehicle_details only when vehicle_type is 'other'", () => {
    const missing = createBookingSchema.safeParse({
      ...VALID_INPUT,
      vehicle_type: "other",
    });
    expect(missing.success).toBe(false);

    const provided = createBookingSchema.safeParse({
      ...VALID_INPUT,
      vehicle_type: "other",
      vehicle_details: "box truck",
    });
    expect(provided.success).toBe(true);
  });

  it("requires parking_available", () => {
    const result = createBookingSchema.safeParse({
      ...VALID_INPUT,
      parking_available: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("treats water/electric as optional (Not sure → omitted)", () => {
    const result = createBookingSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.water_available).toBeUndefined();
      expect(result.data.electric_available).toBeUndefined();
    }
  });

  it("fails when slot_id is not a UUID", () => {
    const result = createBookingSchema.safeParse({
      ...VALID_INPUT,
      slot_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.slot_id).toBeTruthy();
    }
  });

  it("fails when service_ids is empty", () => {
    const result = createBookingSchema.safeParse({
      ...VALID_INPUT,
      service_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it("fails when service_ids contains duplicates", () => {
    const dupe = "660e8400-e29b-41d4-a716-446655440000";
    const result = createBookingSchema.safeParse({
      ...VALID_INPUT,
      service_ids: [dupe, dupe],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.service_ids).toBeTruthy();
    }
  });

  it("fails when customer_email is invalid", () => {
    const result = createBookingSchema.safeParse({
      ...VALID_INPUT,
      customer_email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.customer_email).toBeTruthy();
    }
  });

  it("fails when environmental acknowledgement is not true", () => {
    for (const value of [false, undefined]) {
      const result = createBookingSchema.safeParse({
        ...VALID_INPUT,
        environmental_acknowledgement: value,
      });
      expect(result.success).toBe(false);
    }
  });

  it("normalizes valid Philippine mobile numbers", () => {
    const result = createBookingSchema.safeParse({
      ...VALID_INPUT,
      customer_phone: "0917-123-4567",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customer_phone).toBe("+639171234567");
    }
  });

  it("fails when customer_phone is missing or outside PH mobile format", () => {
    for (const customer_phone of [undefined, "", "+1 555 000 0000"]) {
      const result = createBookingSchema.safeParse({
        ...VALID_INPUT,
        customer_phone,
      });
      expect(result.success).toBe(false);
    }
  });

  it("fails when city is outside the service-area dropdown", () => {
    const result = createBookingSchema.safeParse({
      ...VALID_INPUT,
      city: "Davao City",
    });

    expect(result.success).toBe(false);
  });

  it("fails when customer_name is too short", () => {
    const result = createBookingSchema.safeParse({
      ...VALID_INPUT,
      customer_name: "K",
    });
    expect(result.success).toBe(false);
  });

  it("fails when customer_name contains numbers", () => {
    const result = createBookingSchema.safeParse({
      ...VALID_INPUT,
      customer_name: "Karl123 Marty",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.customer_name).toBeTruthy();
    }
  });

  it("fails when notes exceeds 500 characters", () => {
    const result = createBookingSchema.safeParse({
      ...VALID_INPUT,
      notes: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields when omitted", () => {
    const result = createBookingSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeUndefined();
      expect(result.data.address_line2).toBeUndefined();
    }
  });
});
