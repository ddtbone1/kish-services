// Feature: Dashboard Navigation
// Purpose: Owner-facing sidebar (desktop) + bottom dock (mobile)
// Added: 2026-05-21

"use client";

import { cn } from "@/lib/utils";
import {
  CalendarDays,
  ClipboardList,
  LogOut,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SIDEBAR_LINKS = [
  {
    label: "Bookings",
    href: "/dashboard",
    icon: ClipboardList,
    exact: true,
  },
  {
    label: "Schedule",
    href: "/dashboard/schedule",
    icon: CalendarDays,
    exact: false,
  },
  {
    label: "FAQ",
    href: "/dashboard/faq",
    icon: MessageSquare,
    exact: false,
  },
] as const;

/**
 * Dashboard navigation.
 * - Desktop: fixed left sidebar with icon + label rows
 * - Mobile: bottom dock with icons + labels (matches public nav pattern)
 *
 * @since 2026-05-21
 */
export function DashboardSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar px-4 py-6 min-h-screen border-r border-sidebar-border">
        <SidebarContent pathname={pathname} isActive={isActive} />
      </aside>

      {/* Mobile bottom dock */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex md:hidden justify-around bg-background/95 backdrop-blur-md py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
        aria-label="Dashboard navigation"
      >
        {SIDEBAR_LINKS.map(({ label, href, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 min-w-[3rem] py-1 transition-colors",
                active ? "text-foreground" : "text-muted-foreground",
              )}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={active ? 2 : 1.5}
                aria-hidden
              />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/** Shared sidebar content — rendered only on desktop */
function SidebarContent({
  pathname,
  isActive,
}: {
  pathname: string;
  isActive: (href: string, exact: boolean) => boolean;
}) {
  return (
    <>
      {/* Brand */}
      <Link
        href="/"
        className="mb-8 flex items-center gap-2.5"
        aria-label="Kish Home Services — go to public site"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
          <Sparkles
            className="h-4 w-4 text-foreground"
            strokeWidth={1.5}
            aria-hidden
          />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-extrabold uppercase tracking-widest text-foreground">
            KISH
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Dashboard
          </span>
        </div>
      </Link>

      {/* Nav links */}
      <nav
        className="flex flex-1 flex-col gap-1"
        aria-label="Dashboard navigation"
      >
        {SIDEBAR_LINKS.map(({ label, href, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive(href, exact)
                ? "bg-secondary text-foreground font-semibold"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 shrink-0",
                isActive(href, exact)
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
              strokeWidth={1.5}
              aria-hidden
            />
            {label}
          </Link>
        ))}
      </nav>

      {/* Log out */}
      <form action="/api/auth/signout" method="POST" className="mt-4">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden />
          Log out
        </button>
      </form>
    </>
  );
}
