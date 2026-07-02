// Feature: Public Chat
// Purpose: FAQ chatbot UI — session-based messaging, typing indicator, escalation card
// Added: 2026-05-22

"use client";

import { cn } from "@/lib/utils";
import { MapPin, RotateCcw, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "bot";
  text: string;
  timestamp: Date;
  was_escalated?: boolean;
}

/** Shape persisted to sessionStorage (Date is stored as an ISO string). */
interface StoredMessage {
  role: "user" | "bot";
  text: string;
  timestamp: string;
  was_escalated?: boolean;
}

// Persisted in sessionStorage: the conversation survives page refresh and in-app
// navigation, and clears automatically when the tab is closed. Customers can also
// reset explicitly via the "Clear chat" control.
// Bump the suffix if the persisted shape ever changes (invalidates old entries).
const CHAT_STORAGE_KEY = "kish_chat_v1";

function newSessionId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function ChatWidget() {
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const baseTitleRef = useRef<string>("");

  // Rehydrate the conversation from sessionStorage once on mount. This must run
  // in an effect (not a lazy initializer) so the server and first client render
  // agree — avoiding an SSR hydration mismatch — and so `hydrated` gates
  // persistence. Reading a persisted store on mount is the documented exception
  // to the set-state-in-effect heuristic, hence the scoped disable.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          sessionId?: string;
          messages?: StoredMessage[];
        };
        setSessionId(parsed.sessionId || newSessionId());
        if (Array.isArray(parsed.messages)) {
          setMessages(
            parsed.messages.map((m) => ({
              role: m.role,
              text: m.text,
              timestamp: new Date(m.timestamp),
              was_escalated: m.was_escalated,
            })),
          );
        }
      } else {
        setSessionId(newSessionId());
      }
    } catch {
      setSessionId(newSessionId());
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist sessionId + messages. Guarded by `hydrated` so the initial empty
  // render can't clobber a stored conversation before rehydration completes.
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify({
          sessionId,
          messages: messages.map((m) => ({
            role: m.role,
            text: m.text,
            timestamp: m.timestamp.toISOString(),
            was_escalated: m.was_escalated,
          })),
        }),
      );
    } catch {
      // Ignore quota / serialization errors — persistence is best-effort.
    }
  }, [hydrated, sessionId, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Restore the tab title when the customer returns after a backgrounded reply.
  useEffect(() => {
    baseTitleRef.current = document.title;
    function onVisibility() {
      if (document.visibilityState === "visible") {
        document.title = baseTitleRef.current;
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /** Ask for notification permission once, on a user gesture (first send). */
  function requestNotifyPermission() {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
  }

  /**
   * Notify the customer of a bot reply only while they're away (tab/app in the
   * background). Prefers a native system notification; falls back to flashing
   * the tab title, which is restored on the next visibilitychange.
   */
  function notifyReply(text: string) {
    if (typeof document === "undefined" || document.visibilityState !== "hidden") {
      return;
    }
    const preview = text.length > 80 ? `${text.slice(0, 79)}…` : text;
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification("Kish Auto Detailing", {
          body: preview,
          icon: "/favicon.ico",
        });
        return;
      } catch {
        // Fall through to the title-flash fallback below.
      }
    }
    document.title = "💬 New reply — Kish";
  }

  function handleClear() {
    setMessages([]);
    setSessionId(newSessionId());
    setConfirmClear(false);
    try {
      sessionStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // best-effort
    }
  }

  async function handleSend() {
    const question = input.trim();
    if (!question || loading) return;

    requestNotifyPermission();

    // sessionId is set on mount; guard defensively in case a send races it.
    const activeSessionId = sessionId || newSessionId();
    if (!sessionId) setSessionId(activeSessionId);

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", text: question, timestamp: new Date() },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          session_id: activeSessionId,
          messages: messages.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            text: m.text,
          })),
        }),
      });

      const json = await res.json();

      if (res.ok && json.data) {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: json.data.answer,
            timestamp: new Date(),
            was_escalated: json.data.was_escalated,
          },
        ]);
        notifyReply(json.data.answer);
      } else if (res.status === 429) {
        // Too many messages too quickly — a soft, temporary limit.
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: "You're sending messages a little too quickly. Please wait a moment and try again.",
            timestamp: new Date(),
          },
        ]);
      } else {
        // Assistant unavailable (e.g. temporarily over capacity). Give the
        // customer a real path forward via the escalation "contact us" card.
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: "Sorry — our assistant is temporarily unavailable. You can reach us directly and we'll be glad to help.",
            timestamp: new Date(),
            was_escalated: true,
          },
        ]);
      }
    } catch {
      // Network/parse failure — same graceful fallback with contact details.
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Sorry — we couldn't reach our assistant right now. Please check your connection or contact us directly.",
          timestamp: new Date(),
          was_escalated: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-card rounded-3xl shadow-[var(--shadow-card)] overflow-hidden min-h-0">
      {/* Header — New chat control (shown once a conversation has started) */}
      {messages.length > 0 && (
        <div className="flex items-center justify-end gap-2 border-b border-border px-4 py-2.5">
          {confirmClear ? (
            <>
              <span className="text-xs text-muted-foreground">
                Start a new chat?
              </span>
              <button
                onClick={handleClear}
                className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Yes, clear
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              <RotateCcw className="size-3.5" strokeWidth={2} aria-hidden />
              New chat
            </button>
          )}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.length === 0 && <WelcomeState />}

        {messages.map((msg, i) => (
          <div key={i}>
            <MessageBubble message={msg} />
            {msg.was_escalated && <EscalationCard />}
          </div>
        ))}

        {loading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask us anything about our services…"
            disabled={loading}
            className="flex-1 h-12 rounded-full px-5 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="size-12 rounded-full bg-accent text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
          >
            <Send className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function WelcomeState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="size-14 rounded-2xl bg-accent/10 flex items-center justify-center">
        <Send className="size-6 text-accent" strokeWidth={1.5} />
      </div>
      <div>
        <p className="font-semibold text-foreground">Ask us anything</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Questions about our services, pricing, or scheduling? We&apos;re here
          to help.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "rounded-[24px] bg-foreground text-background"
            : "rounded-[28px] bg-white border border-border text-foreground shadow-sm",
        )}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>
        <p
          className={cn(
            "text-[10px] mt-1.5",
            isUser ? "text-white/60 text-right" : "text-muted-foreground",
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-[28px] bg-white border border-border px-5 py-4 shadow-sm">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2 rounded-full bg-muted-foreground/50 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EscalationCard() {
  return (
    <div className="mt-3 rounded-2xl bg-[var(--card-tint-peach,#FFF4EC)] border border-orange-100 px-4 py-3.5 flex gap-3 items-start">
      <MapPin
        className="size-4 text-orange-500 shrink-0 mt-0.5"
        strokeWidth={1.5}
      />
      <div className="text-sm">
        <p className="font-semibold text-foreground">Need more help?</p>
        <p className="text-muted-foreground mt-0.5">
          Contact us directly and we&apos;ll get back to you as soon as
          possible.
        </p>
        <a
          href="mailto:kishdetailing@gmail.com"
          className="inline-block mt-2 text-accent font-medium hover:underline"
        >
          kishdetailing@gmail.com
        </a>
      </div>
    </div>
  );
}
