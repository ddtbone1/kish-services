import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin client with service_role key — bypasses RLS.
 * Use ONLY in server-side code for operations that require elevated privileges
 * (e.g., email notification logging, admin queries).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
