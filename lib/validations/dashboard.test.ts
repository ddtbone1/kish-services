// Feature: Dashboard
// Purpose: Unit tests for dashboard query-param validation
// Added: 2026-06-24

import { BOOKING_STATUS } from "@/lib/constants/booking";
import { describe, expect, it } from "vitest";
import { parsePage, parseSearchParam, parseStatusParam } from "./dashboard";

describe("parseStatusParam", () => {
  it("accepts every known booking status", () => {
    for (const status of Object.values(BOOKING_STATUS)) {
      expect(parseStatusParam(status)).toBe(status);
    }
  });

  it("ignores unknown values", () => {
    expect(parseStatusParam("garbage")).toBeUndefined();
    expect(parseStatusParam("PENDING")).toBeUndefined(); // case-sensitive
    expect(parseStatusParam("")).toBeUndefined();
    expect(parseStatusParam(undefined)).toBeUndefined();
  });
});

describe("parsePage", () => {
  it("defaults to 1 for missing or invalid input", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
  });

  it("parses and floors valid pages", () => {
    expect(parsePage("2")).toBe(2);
    expect(parsePage("10")).toBe(10);
    expect(parsePage("3.7")).toBe(3);
  });
});

describe("parseSearchParam", () => {
  it("trims and returns the term", () => {
    expect(parseSearchParam("  Karl  ")).toBe("Karl");
  });

  it("returns undefined for empty/whitespace", () => {
    expect(parseSearchParam("   ")).toBeUndefined();
    expect(parseSearchParam("")).toBeUndefined();
    expect(parseSearchParam(undefined)).toBeUndefined();
  });
});
