// Feature: Shared config
// Purpose: Resolve the public base URL for building absolute links (e.g. email links)
// Added: 2026-06-29

const LOCALHOST_FALLBACK = "http://localhost:3000";

/**
 * Returns a valid absolute base URL (no trailing slash) for building links that
 * are viewed outside the app — most importantly the booking links in emails.
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_APP_URL — but only if it parses as an http(s) URL WITH a host.
 *     A misconfigured value like "http://" (empty host) is rejected here; that
 *     is exactly what produced the broken "http:///booking/..." email links.
 *  2. VERCEL_URL — Vercel always injects the deployment host (no protocol).
 *  3. http://localhost:3000 — local/test fallback only.
 */
export function getAppUrl(): string {
  const fromEnv = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (fromEnv) return fromEnv;

  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    const fromVercel = normalizeBaseUrl(`https://${vercel}`);
    if (fromVercel) return fromVercel;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL or VERCEL_URL must be configured in production",
    );
  }

  return LOCALHOST_FALLBACK;
}

/**
 * Validates `value` as an absolute http(s) URL with a non-empty host and returns
 * it without a trailing slash. Returns null for anything malformed (empty,
 * whitespace, "http://", relative paths, unsupported protocols).
 */
function normalizeBaseUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname) return null;

  return `${url.protocol}//${url.host}${url.pathname}`.replace(/\/$/, "");
}
