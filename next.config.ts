import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js requires unsafe-inline for hydration scripts
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Tailwind injects inline styles
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      // Supabase REST + Realtime, Google Generative AI
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com",
      // Google Maps embed (used in location page)
      "frame-src https://www.google.com",
      "frame-ancestors 'none'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
