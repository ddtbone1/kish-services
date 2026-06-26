// Feature: FAQ Management — Entry List
// Purpose: Renders FAQ cards with edit/delete actions; manages modal state
// Added: 2026-05-22

"use client";

import { deleteFaqAction } from "@/app/(dashboard)/dashboard/faq/actions";
import { cn } from "@/lib/utils";
import type { FaqEntry } from "@/types";
import { Edit2, MessageSquarePlus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { FaqModal } from "./FaqModal";

interface Props {
  faqs: FaqEntry[];
}

export function FaqList({ faqs }: Props) {
  const [editingFaq, setEditingFaq] = useState<FaqEntry | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Delete this FAQ entry? This cannot be undone.")) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteFaqAction(id);
      setDeletingId(null);
    });
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <MessageSquarePlus className="size-4" />
          Add FAQ
        </button>
      </div>

      {/* Empty state */}
      {faqs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="size-14 rounded-2xl bg-secondary flex items-center justify-center">
            <MessageSquarePlus
              className="size-7 text-muted-foreground"
              strokeWidth={1.5}
            />
          </div>
          <div>
            <p className="font-semibold text-foreground">No FAQ entries yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add your first question to help customers get quick answers.
            </p>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Add your first question
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {faqs.map((faq) => (
            <FaqCard
              key={faq.id}
              faq={faq}
              isDeleting={deletingId === faq.id}
              onEdit={() => setEditingFaq(faq)}
              onDelete={() => handleDelete(faq.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {isAddOpen && <FaqModal mode="add" onClose={() => setIsAddOpen(false)} />}
      {editingFaq && (
        <FaqModal
          mode="edit"
          faq={editingFaq}
          onClose={() => setEditingFaq(null)}
        />
      )}
    </div>
  );
}

function FaqCard({
  faq,
  isDeleting,
  onEdit,
  onDelete,
}: {
  faq: FaqEntry;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "bg-card rounded-3xl p-5 flex flex-col gap-3 shadow-[var(--shadow-card)] transition-opacity",
        isDeleting && "opacity-50 pointer-events-none",
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-foreground leading-snug flex-1">
          {faq.question}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {/* Active badge */}
          <span
            className={cn(
              "text-[11px] font-semibold px-2.5 py-0.5 rounded-full",
              faq.is_active
                ? "bg-emerald-100 text-emerald-700"
                : "bg-secondary text-muted-foreground",
            )}
          >
            {faq.is_active ? "Active" : "Inactive"}
          </span>
          {/* Edit */}
          <button
            onClick={onEdit}
            aria-label="Edit FAQ"
            className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
          >
            <Edit2 className="size-4" />
          </button>
          {/* Delete */}
          <button
            onClick={onDelete}
            aria-label="Delete FAQ"
            className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Answer */}
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
        {faq.answer}
      </p>

      {/* Tags */}
      {faq.tags && faq.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {faq.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
