// Feature: Unanswered Questions -> FAQ
// Purpose: Turn an unanswered chat question into an FAQ (pre-filled question,
//          owner writes the answer). Creating it also marks the question addressed.
// Added: 2026-07-02

"use client";

import { createFaqFromEscalationAction } from "@/app/(dashboard)/dashboard/chats/actions";
import { X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

interface Props {
  escalationId: string;
  defaultQuestion: string;
  onClose: () => void;
}

export function EscalationFaqModal({
  escalationId,
  defaultQuestion,
  onClose,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    setError(null);

    startTransition(async () => {
      const result = await createFaqFromEscalationAction(escalationId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create FAQ from question"
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
        <div className="w-full max-w-lg bg-card rounded-3xl shadow-[var(--shadow-card)] p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Create FAQ from question</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Once saved, the AI can answer this next time.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="size-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3"
            >
              {error}
            </div>
          )}

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="esc-faq-question"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Question
              </label>
              <input
                id="esc-faq-question"
                name="question"
                type="text"
                required
                minLength={5}
                maxLength={500}
                defaultValue={defaultQuestion}
                placeholder="Clean up the customer's wording if needed..."
                className="h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="esc-faq-answer"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Answer
              </label>
              <textarea
                id="esc-faq-answer"
                name="answer"
                required
                minLength={5}
                maxLength={2000}
                placeholder="Write the answer the bot should give..."
                rows={4}
                className="rounded-2xl px-4 py-3 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 h-11 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 h-11 rounded-full bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Create FAQ"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
