// Feature: Dashboard / Scheduling
// Purpose: Unit tests for Asia/Manila timezone helpers
// Added: 2026-06-24

import { describe, expect, it } from "vitest";
import { manilaDayRangeUtc, manilaTodayDate } from "./timezone";

describe("manilaTodayDate", () => {
  it("returns the Manila calendar date as YYYY-MM-DD", () => {
    // 2026-06-24T08:00:00Z → Manila 16:00 same day
    expect(manilaTodayDate(new Date("2026-06-24T08:00:00Z"))).toBe("2026-06-24");
  });

  it("rolls over to the next Manila day at the +08:00 boundary", () => {
    // Exactly Manila midnight (UTC 16:00 the previous day)
    expect(manilaTodayDate(new Date("2026-06-23T16:00:00Z"))).toBe("2026-06-24");
    // One minute before midnight Manila is still the previous day
    expect(manilaTodayDate(new Date("2026-06-23T15:59:00Z"))).toBe("2026-06-23");
  });
});

describe("manilaDayRangeUtc", () => {
  it("maps a Manila day to the correct exclusive UTC range", () => {
    const { startUtcISO, endUtcISO } = manilaDayRangeUtc("2026-06-24");
    // Manila midnight is 16:00Z the previous day
    expect(startUtcISO).toBe("2026-06-23T16:00:00.000Z");
    expect(endUtcISO).toBe("2026-06-24T16:00:00.000Z");
  });

  it("spans exactly 24 hours", () => {
    const { startUtcISO, endUtcISO } = manilaDayRangeUtc("2026-01-01");
    const ms = new Date(endUtcISO).getTime() - new Date(startUtcISO).getTime();
    expect(ms).toBe(24 * 60 * 60 * 1000);
  });
});
