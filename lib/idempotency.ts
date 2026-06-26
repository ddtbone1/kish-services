// Feature: Idempotency
// Purpose: Supabase-backed idempotency key storage for POST /api/bookings.
//          Clients send `Idempotency-Key: <uuid>` on the request; this module
//          checks for a cached response and stores the result on first success.
//          Keys expire after 24 hours; expired rows are pruned lazily.
// Added: 2026-06-25

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { createHash } from "crypto";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface IdempotencyRecord {
  response_body: Record<string, unknown>;
  status_code: number;
}

type CheckResult =
  | { status: "new" }
  | { status: "replay"; record: IdempotencyRecord }
  | { status: "hash_mismatch" }
  | { status: "error"; error: string };

/** SHA-256 hex digest of the JSON-serialised request body string. */
export function hashBody(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

/**
 * Checks whether an idempotency key has already been used.
 *
 * Returns:
 *   "new"           — key is fresh; proceed with the request
 *   "replay"        — key exists and body matches; return the cached response
 *   "hash_mismatch" — same key, different body; reject with 422
 *   "error"         — unexpected DB failure; reject with 500
 */
export async function checkIdempotencyKey(
  key: string,
  bodyHash: string,
): Promise<CheckResult> {
  const admin = createAdminClient();

  // Lazy cleanup: purge expired keys in the background on every lookup.
  // Fires async — never blocks the request.
  admin
    .from("idempotency_keys")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .then(({ error }) => {
      if (error) {
        logger.warn("Idempotency key cleanup failed", {
          error: error.message,
        });
      }
    });

  const { data, error } = await admin
    .from("idempotency_keys")
    .select("body_hash, response_body, status_code")
    .eq("key", key)
    .single();

  if (error) {
    // PGRST116 = PostgREST "no rows returned" — expected for a fresh key
    if (error.code === "PGRST116") return { status: "new" };
    return { status: "error", error: error.message };
  }

  if (data.body_hash !== bodyHash) return { status: "hash_mismatch" };

  return {
    status: "replay",
    record: {
      response_body: data.response_body as Record<string, unknown>,
      status_code: data.status_code,
    },
  };
}

/**
 * Stores the response for a completed request so future replays can be served
 * from cache. Called only after a successful booking creation.
 */
export async function storeIdempotencyKey(
  key: string,
  bodyHash: string,
  responseBody: Record<string, unknown>,
  statusCode: number,
): Promise<void> {
  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

  const { error } = await admin.from("idempotency_keys").insert({
    key,
    body_hash: bodyHash,
    response_body: responseBody,
    status_code: statusCode,
    expires_at: expiresAt,
  });

  if (error) {
    logger.error("Failed to store idempotency key", {
      key,
      error: error.message,
    });
  }
}
