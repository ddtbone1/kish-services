import { getAvailableSlots } from "@/lib/services/availability.service";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Query parameter 'date' is required in YYYY-MM-DD format" },
      { status: 400 },
    );
  }

  const { data, error } = await getAvailableSlots(date);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ data });
}
