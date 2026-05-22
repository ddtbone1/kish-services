import {
  createSlot,
  getAvailableSlots,
  getSlotsByDateRange,
} from "@/lib/services/availability.service";
import { createClient } from "@/lib/supabase/server";
import { createSlotSchema } from "@/lib/validations/availability";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Range query — used by the owner schedule calendar
  if (from && to) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json(
        { error: "'from' and 'to' must be in YYYY-MM-DD format" },
        { status: 400 },
      );
    }
    const { data, error } = await getSlotsByDateRange(from, to);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ data });
  }

  // Single-date query — used by the public booking form
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      {
        error:
          "Query parameter 'date' is required in YYYY-MM-DD format, or supply 'from' and 'to'",
      },
      { status: 400 },
    );
  }

  const { data, error } = await getAvailableSlots(date);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ data });
}

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
    const parsed = createSlotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { data, error } = await createSlot(parsed.data);
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
