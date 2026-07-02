import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

import { proxy } from "./proxy";

function makeRequest(
  path: string,
  init?: { method?: string; headers?: Record<string, string> },
) {
  return new NextRequest(`http://localhost${path}`, {
    method: init?.method ?? "GET",
    headers: init?.headers,
  });
}

describe("proxy auth guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it("allows public API routes without checking Supabase auth", async () => {
    const response = await proxy(makeRequest("/api/availability?date=2026-07-10"));

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Request-ID")).toBeTruthy();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("blocks unauthenticated owner availability range requests", async () => {
    const response = await proxy(
      makeRequest("/api/availability?from=2026-07-01&to=2026-07-31"),
    );

    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(response.status).toBe(401);
    expect(createServerClient).toHaveBeenCalled();
  });

  it("blocks unauthenticated dashboard API requests", async () => {
    const response = await proxy(
      makeRequest("/api/dashboard/bookings/booking-123", { method: "PATCH" }),
    );

    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(response.status).toBe(401);
  });

  it("redirects unauthenticated dashboard page requests to login", async () => {
    const response = await proxy(makeRequest("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("allows authenticated owner API requests through", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });

    const response = await proxy(
      makeRequest("/api/availability/templates", {
        headers: { "x-request-id": "request-123" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Request-ID")).toBe("request-123");
  });
});
