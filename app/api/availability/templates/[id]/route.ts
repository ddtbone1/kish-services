// Feature: Availability Templates
// Purpose: Owner API to delete a single weekly template by ID
// Added: 2026-05-22

import { deleteTemplate } from "@/lib/services/availability.service";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ─── DELETE /api/availability/templates/[id] ──────────────────────────────────

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await deleteTemplate(id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ data: { id } });
}
