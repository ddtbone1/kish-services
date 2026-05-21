import {
  cancelBookingByToken,
  getBookingByToken,
} from "@/lib/services/booking.service";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const { data, error } = await getBookingByToken(token);

  if (error || !data) {
    return NextResponse.json(
      { error: error ?? "Booking not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const body = await request.json();

    if (body.action === "cancel") {
      const { data, error } = await cancelBookingByToken(token);

      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }

      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
