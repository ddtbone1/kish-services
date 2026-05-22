// Feature: FAQ Management — Modal Dialog
// Purpose: Add / Edit FAQ entry with question, answer, tags, active toggle
// Added: 2026-05-22

"use client";

import {
  createFaqAction,
  updateFaqAction,
} from "@/app/(dashboard)/dashboard/faq/actions";
import { cn } from "@/lib/utils";
import type { FaqEntry } from "@/types";
import { X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

interface Props {
  mode: "add" | "edit";
  faq?: FaqEntry;
  onClose: () => void;
}

export function FaqModal({ mode, faq, onClose }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(faq?.is_active ?? true);

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll while open
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
    // Inject active toggle value (checkbox workaround for controlled state)
    formData.set("is_active", String(isActive));
    setError(null);

    startTransition(async () => {
      const result =
        mode === "add"
          ? await createFaqAction(formData)
          : await updateFaqAction(faq!.id, formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "add" ? "Add FAQ entry" : "Edit FAQ entry"}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
        <div className="w-full max-w-lg bg-card rounded-3xl shadow-[var(--shadow-card)] p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {mode === "add" ? "Add FAQ Entry" : "Edit FAQ Entry"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="size-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3"
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            {/* Question */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="faq-question"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Question
              </label>
              <input
                id="faq-question"
                name="question"
                type="text"
                required
                minLength={5}
                maxLength={500}
                defaultValue={faq?.question}
                placeholder="e.g. How long does a detailing session take?"
                className="h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Answer */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="faq-answer"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Answer
              </label>
              <textarea
                id="faq-answer"
                name="answer"
                required
                minLength={5}
                maxLength={2000}
                defaultValue={faq?.answer}
                placeholder="Provide a clear, helpful answer..."
                rows={4}
                className="rounded-2xl px-4 py-3 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="faq-tags"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Tags{" "}
                <span className="font-normal normal-case">
                  (comma-separated)
                </span>
              </label>
              <input
                id="faq-tags"
                name="tags"
                type="text"
                defaultValue={faq?.tags?.join(", ")}
                placeholder="e.g. pricing, duration, schedule"
                className="h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Active toggle — edit only */}
            {mode === "edit" && (
              <div className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
                <span className="text-sm font-medium">
                  Visible to customers
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  onClick={() => setIsActive((v) => !v)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
                    isActive ? "bg-accent" : "bg-muted-foreground/30",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 rounded-full bg-white shadow-md transition-transform mt-0.5",
                      isActive ? "translate-x-5.5" : "translate-x-0.5",
                    )}
                  />
                </button>
              </div>
            )}

            {/* Actions */}
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
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
