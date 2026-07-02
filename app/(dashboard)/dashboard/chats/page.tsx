import { ChatEscalationList } from "@/components/dashboard/ChatEscalationList";
import { getChatEscalations } from "@/lib/services/chat-escalation.service";
import type { ChatEscalationStatus } from "@/types";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Unanswered Questions - Kish Auto Detailing",
};

const FILTERS: Array<{
  label: string;
  value: ChatEscalationStatus | "all";
  href: string;
}> = [
  { label: "Open", value: "open", href: "/dashboard/chats" },
  { label: "Addressed", value: "resolved", href: "/dashboard/chats?status=resolved" },
  { label: "All", value: "all", href: "/dashboard/chats?status=all" },
];

function parseStatus(value: string | undefined): ChatEscalationStatus | "all" {
  if (value === "resolved" || value === "all") return value;
  return "open";
}

export default async function ChatEscalationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const { data: escalations, error } = await getChatEscalations(status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            Unanswered Questions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Questions the AI couldn&apos;t answer. Turn them into FAQs so the bot
            can handle them next time.
          </p>
        </div>
        <div className="flex rounded-full bg-secondary p-1">
          {FILTERS.map((filter) => {
            const active = filter.value === status;
            return (
              <Link
                key={filter.value}
                href={filter.href}
                className={
                  active
                    ? "rounded-full bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm"
                    : "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                }
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl bg-destructive/10 p-5 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <ChatEscalationList escalations={escalations ?? []} />
      )}
    </div>
  );
}
