import { sendDueAppointmentReminders } from "@/lib/services/reminder.service";
import { isAuthorizedCronRequest } from "@/lib/utils/cron-auth";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function runReminderJob(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await sendDueAppointmentReminders();

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function GET(request: NextRequest) {
  return runReminderJob(request);
}

export async function POST(request: NextRequest) {
  return runReminderJob(request);
}
