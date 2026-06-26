// Feature: Request Tracing
// Purpose: Structured logger with per-request correlation IDs via AsyncLocalStorage.
//          Every log line is tagged [ISO] [LEVEL] [request-id] message {meta}.
// Added: 2026-06-25

import { AsyncLocalStorage } from "async_hooks";

interface LogContext {
  requestId: string;
}

export const requestContext = new AsyncLocalStorage<LogContext>();

function getRequestId(): string {
  return requestContext.getStore()?.requestId ?? "no-req-id";
}

function format(
  level: string,
  message: string,
  meta?: Record<string, unknown>,
): string {
  const ts = new Date().toISOString();
  const rid = getRequestId();
  const base = `[${ts}] [${level}] [${rid}] ${message}`;
  return meta ? `${base} ${JSON.stringify(meta)}` : base;
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) =>
    console.log(format("INFO", message, meta)),

  warn: (message: string, meta?: Record<string, unknown>) =>
    console.warn(format("WARN", message, meta)),

  error: (message: string, meta?: Record<string, unknown>) =>
    console.error(format("ERROR", message, meta)),
};
