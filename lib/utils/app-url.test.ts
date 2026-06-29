import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAppUrl } from "./app-url";

describe("getAppUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses a valid NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://kishautodetailing.com");
    expect(getAppUrl()).toBe("https://kishautodetailing.com");
  });

  it("strips a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://kishautodetailing.com/");
    expect(getAppUrl()).toBe("https://kishautodetailing.com");
  });

  it("rejects a host-less value like 'http://' and falls back", () => {
    // This is the misconfiguration that produced "http:///booking/..." links.
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://");
    expect(getAppUrl()).toBe("http://localhost:3000");
  });

  it("rejects empty/whitespace and falls back", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "   ");
    expect(getAppUrl()).toBe("http://localhost:3000");
  });

  it("falls back to VERCEL_URL when app URL is missing", () => {
    vi.stubEnv("VERCEL_URL", "kish-services.vercel.app");
    expect(getAppUrl()).toBe("https://kish-services.vercel.app");
  });

  it("prefers a valid app URL over VERCEL_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://kishautodetailing.com");
    vi.stubEnv("VERCEL_URL", "kish-services.vercel.app");
    expect(getAppUrl()).toBe("https://kishautodetailing.com");
  });

  it("defaults to localhost when nothing is set", () => {
    expect(getAppUrl()).toBe("http://localhost:3000");
  });

  it("throws in production when no valid app URL is available", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getAppUrl()).toThrow(
      "NEXT_PUBLIC_APP_URL or VERCEL_URL must be configured in production",
    );
  });

  it("uses VERCEL_URL in production when app URL is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_URL", "kish-services.vercel.app");
    expect(getAppUrl()).toBe("https://kish-services.vercel.app");
  });
});
