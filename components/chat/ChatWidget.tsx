// Feature: Public Chat
// Purpose: FAQ chatbot UI — session-based messaging, typing indicator, escalation card
// Added: 2026-05-22

"use client";

import { cn } from "@/lib/utils";
import { MapPin, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "bot";
  text: string;
  timestamp: Date;
  was_escalated?: boolean;
}

export function ChatWidget() {
  const sessionId = useRef<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", text: question, timestamp: new Date() },
    ]);
    setLoading(true);

    try {
      if (!sessionId.current) {
        sessionId.current =
          typeof crypto !== "undefined"
            ? crypto.randomUUID()
            : Math.random().toString(36);
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          session_id: sessionId.current,
          messages: messages.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            text: m.text,
          })),
        }),
      });

      const json = await res.json();

      if (json.data) {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: json.data.answer,
            timestamp: new Date(),
            was_escalated: json.data.was_escalated,
          },
        ]);
      } else {
        throw new Error(json.error ?? "Unknown error");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Something went wrong. Please try again.",
          timestamp: new Date(),
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
