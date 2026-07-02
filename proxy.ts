import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isOwnerAvailabilityRequest(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/api/availability") {
    if (request.method !== "GET") return true;
    return searchParams.has("from") || searchParams.has("to");
  }

  return pathname.startsWith("/api/availability/");
}

function isOwnerApiRequest(request: NextRequest) {
  const { pathname } = request.nextUrl;

  return (
    pathname.startsWith("/api/dashboard/") ||
    isOwnerAvailabilityRequest(request)
  );
}

export async function proxy(request: NextRequest) {
  const requestId =
    request.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");
  const isOwnerApiRoute = isOwnerApiRequest(request);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (!isDashboardRoute && !isOwnerApiRoute) {
    supabaseResponse.headers.set("X-Request-ID", requestId);
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Central guard for owner APIs. Route handlers keep their per-route checks.
  if (!user && isOwnerApiRoute) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "X-Request-ID": requestId },
      },
    );
  }

  // Dashboard pages redirect to login for a better browser experience.
  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const response = NextResponse.redirect(url);
    response.headers.set("X-Request-ID", requestId);
    return response;
  }

  supabaseResponse.headers.set("X-Request-ID", requestId);
  return supabaseResponse;
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*"],
};
