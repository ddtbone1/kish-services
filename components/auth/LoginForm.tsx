// Feature: Auth
// Purpose: Owner-only login form — email/password, no public sign-up
// Added: 2026-05-22

"use client";

import { createClient } from "@/lib/supabase/client";
import { Car } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="bg-card rounded-3xl p-8 shadow-[var(--shadow-card)] flex flex-col gap-6">
      {/* Logo + heading */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="size-12 rounded-2xl bg-accent flex items-center justify-center">
          <Car className="size-6 text-accent-foreground" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Owner Login</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sign in to manage your bookings
          </p>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="bg-destructive/10 text-destructive text-sm rounded-2xl px-4 py-3"
        >
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="email" className="block text-xs font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 rounded-full px-4 text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-full bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-1"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
