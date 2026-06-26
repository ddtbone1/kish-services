import { updateSlotBlocked } from "@/lib/services/availability.service";
import { createClient } from "@/lib/supabase/server";
import { updateSlotSchema } from "@/lib/validations/availability";
import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateSlotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { data, error } = await updateSlotBlocked(id, parsed.data.is_blocked);
    if (error) return NextResponse.json({ error }, { status: 400 });

    // Invalidate the cache for the affected date so the booking form reflects
    // the change immediately (slot now blocked or unblocked).
    if (data?.date) {
      revalidateTag(`availability-${data.date}`, "max");
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch the slot date before deleting so we can invalidate the right cache tag.
  const { data: slot } = await supabase
    .from("availability_slots")
    .select("date")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("availability_slots")
    .delete()
    .eq("id", id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  if (slot?.date) {
    revalidateTag(`availability-${slot.date}`, "max");
  }

  return NextResponse.json({ success: true });
}
