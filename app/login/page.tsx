import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Kish Auto Detailing",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Owner Login</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage your bookings
          </p>
        </div>
        {/* Login form will be implemented here */}
        <p className="text-muted-foreground text-center text-sm">
          Login form coming soon.
        </p>
      </div>
    </main>
  );
}
