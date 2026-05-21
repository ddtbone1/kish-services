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

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar / mobile nav will go here */}
      <aside className="w-full border-b bg-muted/40 px-4 py-3 md:w-64 md:border-b-0 md:border-r md:py-6">
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <nav className="mt-4 flex gap-2 md:flex-col md:gap-1">
          <a href="/dashboard" className="text-sm hover:underline">
            Bookings
          </a>
          <a href="/dashboard/schedule" className="text-sm hover:underline">
            Schedule
          </a>
          <a href="/dashboard/faq" className="text-sm hover:underline">
            FAQ
          </a>
        </nav>
      </aside>
      <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
