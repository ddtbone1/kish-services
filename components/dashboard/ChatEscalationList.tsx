"use client";

import { updateChatEscalationAction } from "@/app/(dashboard)/dashboard/chats/actions";
import { EscalationFaqModal } from "@/components/dashboard/EscalationFaqModal";
import { cn } from "@/lib/utils";
import type { ChatEscalation } from "@/types";
import { CheckCircle2, RotateCcw, Sparkles, X } from "lucide-react";
import { useState, useTransition } from "react";

interface ChatEscalationListProps {
  escalations: ChatEscalation[];
}

export function ChatEscalationList({ escalations }: ChatEscalationListProps) {
  if (escalations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="size-14 rounded-2xl bg-secondary flex items-center justify-center">
          <CheckCircle2 className="size-7 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground">
            You&apos;re all caught up
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Questions the AI couldn&apos;t answer will show up here. Turn them
            into FAQs so the bot handles them next time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {escalations.map((escalation) => (
        <EscalationCard key={escalation.id} escalation={escalation} />
      ))}
    </div>
  );
}

function EscalationCard({ escalation }: { escalation: ChatEscalation }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [, startTransition] = useTransition();
  const isAddressed = escalation.escalation_status === "resolved";

  function setStatus(status: "open" | "resolved") {
    setError(null);
    setPendingStatus(status);
    const formData = new FormData();
    formData.set("status", status);

    startTransition(async () => {
      const result = await updateChatEscalationAction(escalation.id, formData);
      if (result.error) setError(result.error);
      setPendingStatus(null);
    });
  }

  return (
    <article className="bg-card rounded-3xl p-5 shadow-[var(--shadow-card)] space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "text-[11px] font-semibold px-2.5 py-0.5 rounded-full",
            isAddressed
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700",
          )}
        >
          {isAddressed ? "Addressed" : "Open"}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(escalation.created_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-secondary p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Customer asked
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {escalation.question}
          </p>
        </div>
        <div className="rounded-2xl bg-secondary p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            AI couldn&apos;t answer
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {escalation.answer}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {isAddressed ? (
          <button
            type="button"
            onClick={() => setStatus("open")}
            disabled={pendingStatus !== null}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            <RotateCcw className="size-4" />
            {pendingStatus === "open" ? "Reopening..." : "Reopen"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setFaqModalOpen(true)}
              disabled={pendingStatus !== null}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="size-4" />
              Create FAQ
            </button>
            <button
              type="button"
              onClick={() => setStatus("resolved")}
              disabled={pendingStatus !== null}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              <X className="size-4" />
              {pendingStatus === "resolved" ? "Dismissing..." : "Dismiss"}
            </button>
          </>
        )}
      </div>

      {faqModalOpen && (
        <EscalationFaqModal
          escalationId={escalation.id}
          defaultQuestion={escalation.question}
          onClose={() => setFaqModalOpen(false)}
        />
      )}
    </article>
  );
}
