import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockProcessDueEmailRetries = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/email.service", () => ({
  processDueEmailRetries: mockProcessDueEmailRetries,
}));

import { GET, POST } from "./route";

const ORIGINAL_ENV = { ...process.env };

function makeRequest(secret?: string): NextRequest {
  return new NextRequest("http://localhost/api/jobs/email-retries", {
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  });
}

describe("/api/jobs/email-retries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
    mockProcessDueEmailRetries.mockResolvedValue({
      data: {
        checked: 1,
        claimed: 1,
        sent: 1,
        failed: 0,
        exhausted: 0,
        skipped: 0,
      },
      error: null,
    });
  });

  afterEach(() => {
    Object.keys(process.env).forEach((k) => {
      if (!(k in ORIGINAL_ENV)) delete process.env[k];
    });
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("rejects requests without the cron secret", async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(mockProcessDueEmailRetries).not.toHaveBeenCalled();
  });

  it("runs retries for authorized GET requests", async () => {
    const res = await GET(makeRequest("test-secret"));

    expect(res.status).toBe(200);
    expect(mockProcessDueEmailRetries).toHaveBeenCalledOnce();
  });

  it("runs retries for authorized POST requests", async () => {
    const res = await POST(makeRequest("test-secret"));

    expect(res.status).toBe(200);
    expect(mockProcessDueEmailRetries).toHaveBeenCalledOnce();
  });
});
