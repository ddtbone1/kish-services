// Feature: Navigation
// Purpose: Floating top nav pill (desktop) + floating bottom dock (mobile)
// Added: 2026-05-21

"use client";

import { cn } from "@/lib/utils";
import {
  Car,
  Home,
  MapPin,
  Menu,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Services", href: "/#services", icon: Car },
  { label: "Location", href: "/location", icon: MapPin },
  { label: "Chat", href: "/chat", icon: MessageCircle },
] as const;

/**
 * Public navigation.
 * - Desktop: floating centered top nav pill with brand + links + Book Now CTA
 * - Mobile: floating centered bottom dock with 4 icon-only items, black active circle
 *
 * Reference: premium mobile app aesthetic with floating pill navigation.
 *
 * @since 2026-05-21
 */
export function Navbar() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function handleNavClick(href: string) {
    // Immediately sync hash state so active indicator updates without waiting for hashchange
    const newHash = href.includes("#") ? href.substring(href.indexOf("#")) : "";
    setHash(newHash);
  }

  function isActiveRoute(href: string) {
    if (href.startsWith("/#")) {
      return pathname === "/" && hash === href.substring(href.indexOf("#"));
    }
    if (href === "/") {
      // reason: home is only active when there is no hash anchor selected
      return pathname === "/" && (!hash || hash === "");
    }
    return pathname.startsWith(href);
  }

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Only the home page has a dark hero image; all other pages have light backgrounds
  const hasDarkHero = pathname === "/";
  // Use dark text when on a light-background page OR when scrolled (white navbar)
  const useDarkText = !hasDarkHero || isScrolled;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Desktop: Full-width sticky header with dynamic scroll effect */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 hidden md:flex items-center transition-all duration-300",
          isScrolled
            ? "bg-white/80 backdrop-blur-xl border-b border-border shadow-sm h-16"
            : hasDarkHero
              ? "bg-transparent h-24"
              : "bg-white/80 backdrop-blur-xl border-b border-border h-20",
        )}
      >
        <div
          className={cn(
            "w-full flex items-center justify-between relative h-full transition-all duration-500 ease-in-out px-6 md:px-16",
            isScrolled
              ? "max-w-[1024px] mx-auto"
              : "max-w-[100vw] mx-auto lg:px-24"
          )}
        >
          {/* Logo Left - Purely Typographical Kish Branding */}
          <Link
            href="/"
            onClick={() => handleNavClick("/")}
            className="transition-transform hover:scale-105"
            aria-label="Kish — home"
          >
            <span
              className={cn(
                "text-xl font-light tracking-[0.2em] uppercase transition-colors",
                useDarkText ? "text-black" : "text-white",
              )}
            >
              Kish
            </span>
          </Link>

          {/* Nav links Center */}
          <nav
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-10"
            aria-label="Main navigation"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "text-sm font-medium transition-all hover:text-accent",
                  isActiveRoute(item.href)
                    ? "text-accent"
                    : useDarkText
                      ? "text-black/70"
                      : "text-white/90 drop-shadow-md",
                )}
                aria-current={isActiveRoute(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA Right */}
          <Link
            href="/book"
            onClick={() => handleNavClick("/book")}
            className={cn(
              "rounded-full transition-all flex items-center gap-2 text-sm font-medium shadow-xl group bg-accent text-white",
              isScrolled ? "px-6 h-10" : "px-8 h-12",
            )}
          >
            Book a Wash
            <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
          </Link>
        </div>
      </header>

      {/* Mobile: Top Bar & Sidebar */}
      <div className="md:hidden">
        {/* Mobile Top Bar */}
        <header
          className={cn(
            "fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-6 transition-all duration-300",
            isScrolled
              ? "bg-white/90 backdrop-blur-xl border-b border-border shadow-sm"
              : hasDarkHero
                ? "bg-transparent"
                : "bg-white/90 backdrop-blur-xl border-b border-border",
          )}
        >
          <Link
            href="/"
            className={cn(
              "text-lg font-light tracking-[0.2em] uppercase transition-colors",
              useDarkText ? "text-black" : "text-white",
            )}
          >
            Kish
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={cn(
              "p-2 -mr-2 transition-colors",
              useDarkText ? "text-black" : "text-white",
            )}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar Content */}
        <div
          className={cn(
            "fixed top-0 right-0 z-[101] h-full w-[80%] max-w-xs bg-white shadow-2xl transition-transform duration-300 ease-in-out p-8 flex flex-col gap-10",
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl font-light tracking-[0.2em] uppercase">
              Kish
            </span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 -mr-2"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex flex-col gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  handleNavClick(item.href);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "text-2xl font-normal transition-colors",
                  isActiveRoute(item.href) ? "text-accent" : "text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto">
            <Link
              href="/book"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center w-full h-14 rounded-full bg-accent text-white font-medium text-lg shadow-xl"
            >
              Book a Wash
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
