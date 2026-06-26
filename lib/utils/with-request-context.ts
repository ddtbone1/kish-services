// Feature: Request Tracing
// Purpose: Wraps a Next.js route handler body in the requestContext
//          AsyncLocalStorage store so that logger.ts picks up the request ID
//          without threading it through function signatures.
//          Must be called from Node.js route handlers (not Edge runtime).
// Added: 2026-06-25

import { requestContext } from "@/lib/logger";
import type { NextRequest } from "next/server";

export function withRequestContext<T>(
  request: NextRequest,
  fn: () => Promise<T>,
): Promise<T> {
  const requestId =
    request.headers.get("x-request-id") ?? crypto.randomUUID();
  return requestContext.run({ requestId }, fn);
}
