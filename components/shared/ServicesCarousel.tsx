"use client";

import React, { useRef, useState, useEffect } from "react";
import type { Service } from "@/types";
import {
  Car,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Wind,
  Eye,
  Disc,
} from "lucide-react";
import Link from "next/link";

interface ServicesCarouselProps {
  services: Service[];
}

const getServiceConfig = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("interior")) {
    return {
      icon: Car,
      gradient: "from-sky-500/10 to-indigo-500/10 hover:from-sky-500/20 hover:to-indigo-500/20",
      badgeColor: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
      iconColor: "text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-950/40",
      borderGlow: "hover:border-sky-500/30 hover:shadow-sky-500/10",
      accentBg: "bg-sky-500/5",
    };
  }
  if (n.includes("lens") || n.includes("headlight")) {
    return {
      icon: Eye,
      gradient: "from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20",
      badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
      iconColor: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",
      borderGlow: "hover:border-amber-500/30 hover:shadow-amber-500/10",
      accentBg: "bg-amber-500/5",
    };
  }
  if (n.includes("buffing") || n.includes("polish")) {
    return {
      icon: Disc,
      gradient: "from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-emerald-500/20",
      badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
      iconColor: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
      borderGlow: "hover:border-emerald-500/30 hover:shadow-emerald-500/10",
      accentBg: "bg-emerald-500/5",
    };
  }
  if (n.includes("odor") || n.includes("disinfection") || n.includes("zero")) {
    return {
      icon: Wind,
      gradient: "from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20",
      badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      iconColor: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/40",
      borderGlow: "hover:border-purple-500/30 hover:shadow-purple-500/10",
      accentBg: "bg-purple-500/5",
    };
  }
  return {
    icon: Sparkles,
    gradient: "from-accent/10 to-teal-500/10 hover:from-accent/20 hover:to-teal-500/20",
    badgeColor: "bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-foreground",
    iconColor: "text-accent bg-accent/5 dark:text-accent dark:bg-accent/15",
    borderGlow: "hover:border-accent/30 hover:shadow-accent/10",
    accentBg: "bg-accent/5",
  };
};

export default function ServicesCarousel({ services }: ServicesCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handleScroll = React.useCallback(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const { scrollLeft, scrollWidth, clientWidth } = container;

      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);

      // Identify the slide that is closest to the left of the viewport
      const children = Array.from(container.children) as HTMLElement[];
      let closestIndex = 0;
      let minDistance = Infinity;

      children.forEach((child, index) => {
        const childLeft = child.offsetLeft - container.offsetLeft;
        const distance = Math.abs(childLeft - scrollLeft);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      setActiveIndex(closestIndex);
    }
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      // Initial check
      handleScroll();
    }
    window.addEventListener("resize", handleScroll);
    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
      window.removeEventListener("resize", handleScroll);
    };
  }, [handleScroll]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const firstChild = container.firstElementChild as HTMLElement;
      if (!firstChild) return;

      const cardWidth = firstChild.clientWidth;
      const style = window.getComputedStyle(container);
      const gap = parseInt(style.columnGap || style.gap || "24", 10);
      const scrollAmount =
        direction === "left" ? -(cardWidth + gap) : cardWidth + gap;

      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const scrollToCard = (index: number) => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const cards = container.children;
      if (cards[index]) {
        const card = cards[index] as HTMLElement;
        container.scrollTo({
          left: card.offsetLeft - container.offsetLeft,
          behavior: "smooth",
        });
      }
    }
  };

  return (
    <div className="relative w-full">
      {/* Navigation Controls in top row */}
      <div className="flex justify-between items-end mb-10">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              What We Offer
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-normal tracking-tight text-foreground">
            Our Services
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl">
            Book any premium detailing package online — we come directly to you.
          </p>
        </div>

        {/* Desktop Buttons */}
        <div className="hidden md:flex gap-3 items-center pb-2">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Previous service"
            className={`flex items-center justify-center size-14 rounded-full border border-border bg-white text-foreground transition-all shadow-sm
              ${
                canScrollLeft
                  ? "hover:bg-secondary hover:scale-105 active:scale-95 cursor-pointer"
                  : "opacity-40 cursor-not-allowed"
              }`}
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Next service"
            className={`flex items-center justify-center size-14 rounded-full border border-border bg-white text-foreground transition-all shadow-sm
              ${
                canScrollRight
                  ? "hover:bg-secondary hover:scale-105 active:scale-95 cursor-pointer"
                  : "opacity-40 cursor-not-allowed"
              }`}
          >
            <ChevronRight className="size-6" />
          </button>
        </div>
      </div>

      {/* Touch slider container */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-6 pb-8 -mx-6 md:-mx-16 lg:-mx-24 px-6 md:px-16 lg:px-24 scrollbar-none snap-x snap-mandatory scroll-smooth"
      >
        {services.map((service) => {
          const config = getServiceConfig(service.name);
          const IconComponent = config.icon;

          return (
            <div
              key={service.id}
              className={`w-[300px] sm:w-[380px] shrink-0 snap-start rounded-3xl p-8 sm:p-10 flex flex-col gap-6 bg-white/80 border border-border transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-2 group relative overflow-hidden ${config.borderGlow}`}
            >
              {/* Card top border glow gradient */}
              <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${config.gradient}`} />

              <div className="flex items-start justify-between relative z-10">
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold text-2xl sm:text-3xl leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {service.name}
                  </h3>
                </div>
                <div className={`p-4 rounded-2xl transition-all duration-300 group-hover:scale-110 ${config.iconColor}`}>
                  <IconComponent className="size-6 sm:size-7" />
                </div>
              </div>

              {/* Time Indicator Badge */}
              <div className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground bg-secondary px-4 py-2 rounded-full self-start relative z-10">
                <Clock className="size-4 text-accent" />
                <span>{service.duration_minutes} Minutes</span>
              </div>

              {/* Description */}
              {service.description && (
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium line-clamp-3 relative z-10">
                  {service.description}
                </p>
              )}

              {/* Footer row */}
              <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/80 relative z-10">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Starting at
                  </span>
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mt-0.5">
                    ₱{service.price.toLocaleString()}
                  </span>
                </div>
                <Link
                  href={`/book?service=${service.id}`}
                  className="inline-flex items-center justify-center size-14 rounded-full bg-primary text-primary-foreground hover:bg-accent hover:text-white transition-all duration-300 shadow-md group-hover:scale-110"
                >
                  <Sparkles className="size-5 transition-transform group-hover:rotate-12" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicator dots & Mobile Swiping prompt */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
        {/* Swipe instructions (visible on mobile only) */}
        <p className="text-xs font-semibold text-muted-foreground md:hidden animate-pulse">
          Swipe left or right to explore packages →
        </p>

        {/* Dots */}
        <div className="flex gap-2">
          {services.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToCard(index)}
              aria-label={`Go to service slide ${index + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                activeIndex === index
                  ? "w-8 bg-accent"
                  : "w-2.5 bg-border hover:bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
