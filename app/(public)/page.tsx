import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/types";
import { Car, Clock, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kish Auto Detailing Services",
  description:
    "Professional auto detailing services. Book your appointment online.",
};

async function getServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) console.error("[getServices] failed", error.code, error.message);
  return (data as Service[]) ?? [];
}

const HOW_STEPS = [
  {
    n: 1,
    title: "Choose",
    copy: "Pick your package and any add-ons you'd like.",
  },
  {
    n: 2,
    title: "Book",
    copy: "Select a date and time that works for you.",
  },
  {
    n: 3,
    title: "We Come to You",
    copy: "Our team arrives at your location — you relax.",
  },
];

export default async function HomePage() {
  const services = await getServices();

  return (
    <div className="flex flex-col w-full bg-white">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-start overflow-hidden px-6 md:px-16 pt-20">
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-bg.jpg"
            alt="Car Detailing"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative z-10 max-w-5xl flex flex-col gap-10">
          <h1 className="text-6xl md:text-8xl font-normal tracking-tight text-white leading-tight">
            Tap. Book. <br />
            <span className="text-accent italic font-normal">
              We Come to You.
            </span>
          </h1>

          <p className="text-white/95 text-xl md:text-2xl font-medium max-w-2xl drop-shadow-md">
            Fast, eco-friendly, and flawless every time. Experience the next
            generation of car care.
          </p>

          <div className="flex flex-wrap gap-4 mt-4">
            <Link
              href="/book"
              className="inline-flex items-center justify-center h-16 px-10 rounded-full bg-accent text-white font-black text-lg hover:opacity-95 transition-all shadow-xl group"
            >
              Book A Wash
              <Sparkles className="ml-3 h-5 w-5 transition-transform group-hover:rotate-12" />
            </Link>
          </div>
        </div>
      </section>

      {/* Services — immediately after hero */}
      <section
        id="services"
        className="px-6 md:px-16 py-32 bg-secondary/30 w-full"
      >
        <div className="w-full">
          <div className="mb-16 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="size-2 rounded-full bg-accent" />
              <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                What We Offer
              </span>
            </div>
            <h2 className="text-3xl md:text-6xl font-normal">Our Services</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Book any service online — we come directly to you. No driving, no
              waiting.
            </p>
          </div>
          {services.length === 0 ? (
            <p className="text-muted-foreground text-lg italic">
              Our team is busy detailing. Packages back online soon!
            </p>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service, i) => (
                <div
                  key={service.id}
                  className="group bg-white rounded-3xl p-10 flex flex-col gap-6 shadow-sm hover:shadow-2xl transition-all border border-border hover:-translate-y-2"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-3xl leading-tight">
                      {service.name}
                    </h3>
                    <div className="p-3 bg-accent/10 rounded-2xl group-hover:bg-accent group-hover:text-white transition-colors text-accent">
                      <Car className="size-6" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground bg-secondary px-4 py-2 rounded-full self-start">
                    <Clock className="size-4" />
                    {service.duration_minutes} Minutes
                  </div>

                  {service.description && (
                    <p className="text-lg text-muted-foreground leading-relaxed font-medium line-clamp-3">
                      {service.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-8 border-t border-border">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Starting at
                      </span>
                      <span className="text-4xl font-medium">
                        ₱{service.price.toLocaleString()}
                      </span>
                    </div>
                    <Link
                      href={`/book?service=${service.id}`}
                      className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-black text-white hover:bg-accent transition-all shadow-md group-hover:scale-110"
                    >
                      <Sparkles className="size-6" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About Us */}
      <section className="px-6 md:px-16 py-24 md:py-32 w-full grid md:grid-cols-2 gap-20 items-start border-b border-border">
        <div className="flex flex-col gap-10">
          <div className="flex items-center gap-3">
            <div className="size-2 rounded-full bg-accent" />
            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              About Kish
            </span>
          </div>
          <h2 className="text-4xl md:text-7xl font-normal tracking-tight leading-[1.1]">
            Make quality car care easy, reliable, and surprisingly satisfying.
          </h2>
        </div>

        <div className="flex flex-col gap-12 mt-12 md:mt-24">
          <div className="flex flex-col gap-8">
            <p className="text-xl text-muted-foreground leading-relaxed font-medium">
              At Kish, we believe that a car wash should be more than a rinse
              and go. It should be an experience — fast, flawless, and handled
              with care.
            </p>
            <p className="text-xl text-muted-foreground leading-relaxed font-medium">
              We bring together passionate detailers and efficiency experts to
              deliver a car care experience where your time, your car, and the
              planet are respected equally.
            </p>
            <Link
              href="/location"
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
            >
              Find our location →
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Booking CTA */}
      <section className="px-6 md:px-16 py-32 bg-accent flex flex-col items-center text-center gap-10">
        <h2 className="text-4xl md:text-7xl font-normal text-white max-w-4xl leading-tight">
          Ready to give your car the Shine it deserves?
        </h2>
        <Link
          href="/book"
          className="inline-flex items-center justify-center h-20 px-16 rounded-full bg-white text-black font-medium text-2xl shadow-2xl hover:scale-105 transition-all"
        >
          Get Started Now
        </Link>
      </section>
    </div>
  );
}
