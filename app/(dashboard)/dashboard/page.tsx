import { BookingFilters } from "@/components/dashboard/BookingFilters";
import { BookingSearch } from "@/components/dashboard/BookingSearch";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  getBookings,
  getDashboardMetrics,
} from "@/lib/services/dashboard.service";
import { formatTime } from "@/lib/utils/datetime";
import {
  parsePage,
  parseSearchParam,
  parseStatusParam,
} from "@/lib/validations/dashboard";
import { AlertTriangle, ChevronRight, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";

// Cache dashboard metrics for 60 s. Invalidated by revalidateTag("dashboard-metrics", "max")
// in the PATCH /api/dashboard/bookings/[id] route after every status update.
const getCachedDashboardMetrics = unstable_cache(
  getDashboardMetrics,
  ["dashboard-metrics"],
  { revalidate: 60, tags: ["dashboard-metrics"] },
);

export const metadata: Metadata = {
  title: "Dashboard - Kish Auto Detailing",
};

const PAGE_SIZE = 20;

/** Builds a /dashboard URL preserving status & q while overriding the page. */
function pageHref(
  status: string | undefined,
  q: string | undefined,
  page: number,
): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

function DashboardError({ message }: { message: string }) {
  return (
    <div className="bg-[var(--card-tint-peach)] rounded-3xl p-6 flex items-start gap-3 shadow-[var(--shadow-card)]">
      <AlertTriangle
        className="size-5 text-red-600 flex-shrink-0 mt-0.5"
        strokeWidth={2}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-sm">Couldn’t load this data</p>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const activeStatus = parseStatusParam(params.status);
  const search = parseSearchParam(params.q);
  const page = parsePage(params.page);

  const [metricsRes, bookingsRes] = await Promise.all([
    getCachedDashboardMetrics(),
    getBookings({ status: activeStatus, q: search, page, pageSize: PAGE_SIZE }),
  ]);

  const metrics = metricsRes.data;
  const bookingsPage = bookingsRes.data;

  const STATS_CARDS = metrics
    ? [
        {
          label: "Total Bookings",
          value: metrics.total,
          tint: "bg-card",
        },
        {
          label: "Pending",
          value: metrics.counts.pending,
          tint: "bg-[var(--card-tint-peach)]",
        },
        {
          label: "Confirmed",
          value: metrics.counts.confirmed,
          tint: "bg-[var(--card-tint-mint)]",
        },
        {
          label: "Total Completed",
          value: metrics.counts.completed,
          tint: "bg-[var(--card-tint-lavender)]",
        },
        {
          label: "Completed Today",
          value: metrics.completedToday,
          tint: "bg-[var(--card-tint-mint)]",
        },
        {
          label: "Upcoming Appointments",
          value: metrics.upcoming,
          tint: "bg-[var(--card-tint-lavender)]",
        },
      ]
    : [];

  const totalPages = bookingsPage
    ? Math.max(1, Math.ceil(bookingsPage.total / PAGE_SIZE))
    : 1;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold md:text-3xl">Bookings</h1>

      {/* Metrics */}
      {metricsRes.error ? (
        <DashboardError message={metricsRes.error} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {STATS_CARDS.map(({ label, value, tint }) => (
            <div
              key={label}
              className={`${tint} rounded-3xl p-4 flex flex-col gap-1 shadow-[var(--shadow-card)]`}
            >
              <span className="text-3xl font-bold tabular-nums">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <BookingSearch />

      {/* Filter tabs (counts come from metrics; fall back to zeros on metric error) */}
      <BookingFilters
        activeStatus={activeStatus}
        counts={
          metrics?.counts ?? {
            pending: 0,
            confirmed: 0,
            on_the_way: 0,
            completed: 0,
            cancelled: 0,
            declined: 0,
          }
        }
        total={metrics?.total ?? 0}
      />

      {/* Bookings list */}
      {bookingsRes.error ? (
        <DashboardError message={bookingsRes.error} />
      ) : !bookingsPage || bookingsPage.rows.length === 0 ? (
        <div className="bg-card rounded-3xl p-12 flex flex-col items-center gap-3 shadow-[var(--shadow-card)] text-center">
          <Inbox
            className="size-10 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <p className="text-muted-foreground text-sm">
            {search
              ? `No bookings match “${search}”.`
              : activeStatus
                ? `No ${activeStatus} bookings.`
                : "No bookings yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {bookingsPage.rows.map((booking) => {
              const serviceNames =
                booking.booking_items
                  .map((item) => item.service?.name)
                  .filter(Boolean)
                  .join(", ") || "—";

              const slot = booking.slot;
              const slotLabel = slot
                ? `${new Date(slot.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${formatTime(slot.start_time)}`
                : "—";

              return (
                <Link
                  key={booking.id}
                  href={`/dashboard/bookings/${booking.id}`}
                  className="bg-card rounded-2xl px-4 py-3 flex items-center gap-3 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">
                        {booking.customer_name}
                      </span>
                      <StatusBadge status={booking.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {serviceNames}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {slotLabel} · {booking.city}
                    </p>
                  </div>
                  <ChevronRight
                    className="size-4 text-muted-foreground flex-shrink-0"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {bookingsPage.total > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {bookingsPage.total} total
              </span>
              <div className="flex gap-2">
                <PaginationLink
                  href={pageHref(activeStatus, search, page - 1)}
                  disabled={page <= 1}
                  label="Previous"
                />
                <PaginationLink
                  href={pageHref(activeStatus, search, page + 1)}
                  disabled={page >= totalPages}
                  label="Next"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PaginationLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="h-8 px-4 rounded-full text-xs font-medium inline-flex items-center bg-muted text-muted-foreground cursor-not-allowed">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="h-8 px-4 rounded-full text-xs font-medium inline-flex items-center bg-card border border-border hover:bg-muted text-foreground transition-colors"
    >
      {label}
    </Link>
  );
}
