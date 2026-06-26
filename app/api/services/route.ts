// Feature: Response Caching
// Purpose: Services list cached for 10 minutes. Services rarely change;
//          re-querying on every booking form load wastes Supabase quota.
//          Uses admin client inside the cached function (no per-request cookies).
// Updated: 2026-06-25

import { createAdminClient } from "@/lib/supabase/admin";
import type { Service } from "@/types";
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const getCachedServices = unstable_cache(
  async () => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });
    return { data: data as Service[] | null, error };
  },
  ["services-list"],
  { revalidate: 600, tags: ["services"] },
);

export async function GET() {
  const { data, error } = await getCachedServices();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
