// Feature: Dashboard
// Purpose: Auth-guarded owner dashboard layout with sidebar navigation
// Added: 2026-05-21

import { DashboardSidebar } from "@/components/shared/DashboardSidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // security: server-side auth guard — middleware is the first line of defence
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <DashboardSidebar />
      <main className="flex-1 px-5 py-6 pb-20 md:px-8 md:pb-6">{children}</main>
    </div>
  );
}
