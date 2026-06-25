// Feature: Conditional Footer
// Purpose: Only render the footer on pages that benefit from it (not on app-like pages)
// Added: 2026-06-25

"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

/** Routes where the footer should be hidden (app-like interactive pages) */
const FOOTER_HIDDEN_ROUTES = ["/chat", "/book"];

export function ConditionalFooter() {
  const pathname = usePathname();

  // Hide footer on app-like pages (chat, booking form) where it wastes space
  const shouldHide = FOOTER_HIDDEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  // Exception: show footer on booking confirmation page
  if (pathname.includes("/book/confirmation")) return <Footer />;

  if (shouldHide) return null;

  return <Footer />;
}
