// Feature: Availability Templates
// Purpose: Owner API to trigger bulk slot generation from active weekly templates
// Added: 2026-05-22

import { generateSlotsFromTemplates } from "@/lib/services/availability.service";
import { createClient } from "@/lib/supabase/server";
import { generateSlotsSchema } from "@/lib/validations/availability";
import { NextResponse, type NextRequest } from "next/server";

// ─── POST /api/availability/generate ─────────────────────────────────────────
// Body: { from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
// Returns the number of newly created slots.

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = generateSlotsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { from, to } = parsed.data;

    // Guard: prevent generating slots too far into the future (max 1 year)
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffDays =
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);

    if (toDate < fromDate) {
      return NextResponse.json(
        { error: "'to' date must be after 'from' date" },
        { status: 400 },
      );
    }

    if (diffDays > 365) {
      return NextResponse.json(
        { error: "Date range cannot exceed 365 days" },
        { status: 400 },
      );
    }

    const { data, error } = await generateSlotsFromTemplates(parsed.data);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ data: { inserted: data } });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
