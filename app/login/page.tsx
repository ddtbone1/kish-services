import { LoginForm } from "@/components/auth/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Kish Auto Detailing",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </main>
  );
}
