import { ScheduleCalendar } from "@/components/dashboard/ScheduleCalendar";
import { WeeklyTemplatePanel } from "@/components/dashboard/WeeklyTemplatePanel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule Management - Kish Auto Detailing",
};

export default function SchedulePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold md:text-3xl">Schedule</h1>
      <ScheduleCalendar />
      <WeeklyTemplatePanel />
    </div>
  );
}
