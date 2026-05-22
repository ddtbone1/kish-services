// Feature: Availability Templates
// Purpose: Owner API to list and create weekly availability templates
// Added: 2026-05-22

import {
  createTemplate,
  getTemplates,
} from "@/lib/services/availability.service";
import { createClient } from "@/lib/supabase/server";
import { createTemplateSchema } from "@/lib/validations/availability";
import { NextResponse, type NextRequest } from "next/server";

// ─── GET /api/availability/templates ─────────────────────────────────────────

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await getTemplates();

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ─── POST /api/availability/templates ────────────────────────────────────────

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
    const parsed = createTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { data, error } = await createTemplate(parsed.data);

    if (error || !data) {
      return NextResponse.json(
        { error: error ?? "Failed to create template" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
