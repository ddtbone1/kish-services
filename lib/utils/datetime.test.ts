// Feature: Shared formatting
// Purpose: Unit tests for the shared formatTime helper
// Added: 2026-06-24

import { describe, expect, it } from "vitest";
import { formatTime } from "./datetime";

describe("formatTime", () => {
  it("formats morning times", () => {
    expect(formatTime("09:30:00")).toBe("9:30 AM");
    expect(formatTime("00:00")).toBe("12:00 AM");
  });

  it("formats afternoon/evening times", () => {
    expect(formatTime("13:00")).toBe("1:00 PM");
    expect(formatTime("12:15:00")).toBe("12:15 PM");
    expect(formatTime("23:45")).toBe("11:45 PM");
  });
});
