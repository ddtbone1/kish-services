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
  it("passes for { action: 'cancel' }", () => {
    const result = cancelBookingSchema.safeParse({ action: "cancel" });
    expect(result.success).toBe(true);
  });

  it("fails when action is missing", () => {
    const result = cancelBookingSchema.safeParse({});
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
    address_line1: "123 Main St",
    city: "General Santos City",
  };

  it("passes for a valid booking input", () => {
    const result = createBookingSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
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

  it("fails when customer_name is too short", () => {
    const result = createBookingSchema.safeParse({
      ...VALID_INPUT,
      customer_name: "K",
    });
    expect(result.success).toBe(false);
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
      expect(result.data.add_on_ids).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
      expect(result.data.address_line2).toBeUndefined();
    }
  });
});
