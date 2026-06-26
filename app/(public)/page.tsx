import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/types";
import { Sparkles } from "lucide-react";
import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import ServicesCarousel from "@/components/shared/ServicesCarousel";

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

export default async function HomePage() {
  const services = await getServices();

  return (
    <div className="flex flex-col w-full bg-white">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-start overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-bg.jpg"
            alt="Car Detailing"
            fill
            priority
            sizes="100vw"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative z-10 w-full px-6 md:px-16 lg:px-24">
          <div className="max-w-5xl flex flex-col gap-6 text-left">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-white leading-[1.05]">
              Tap. Book. <br />
              <span className="text-accent italic font-normal">
                We Come to You.
              </span>
            </h1>

            <p className="text-white/90 text-lg md:text-xl font-normal max-w-xl drop-shadow-md leading-relaxed">
              Fast, eco-friendly, and flawless every time. Experience the next
              generation of car care.
            </p>

            <div className="flex flex-wrap gap-4 mt-2">
              <Link
                href="/book"
                className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-accent text-white font-semibold text-sm hover:opacity-95 transition-all shadow-md group"
              >
                Book A Wash
                <Sparkles className="ml-2 h-4 w-4 transition-transform group-hover:rotate-12" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services — immediately after hero */}
      <section
        id="services"
        className="py-32 bg-secondary/30 w-full overflow-hidden"
      >
        <div className="w-full px-6 md:px-16 lg:px-24">
          {services.length === 0 ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="size-2 rounded-full bg-accent" />
                <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  What We Offer
                </span>
              </div>
              <h2 className="text-3xl md:text-6xl font-normal mb-6">Our Services</h2>
              <p className="text-muted-foreground text-lg italic">
                Our team is busy detailing. Packages back online soon!
              </p>
            </div>
          ) : (
            <ServicesCarousel services={services} />
          )}
        </div>
      </section>

      {/* About Us */}
      <section className="py-24 md:py-32 w-full border-b border-border bg-white">
        <div className="px-6 md:px-16 lg:px-24 w-full grid md:grid-cols-2 gap-20 items-start">
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
        </div>
      </section>

      {/* Quick Booking CTA */}
      <section className="py-32 bg-accent w-full">
        <div className="px-6 md:px-16 max-w-5xl mx-auto w-full flex flex-col items-center text-center gap-10">
          <h2 className="text-4xl md:text-7xl font-normal text-white max-w-4xl leading-tight">
            Ready to give your car the Shine it deserves?
          </h2>
          <Link
            href="/book"
            className="inline-flex items-center justify-center h-20 px-16 rounded-full bg-white text-black font-medium text-2xl shadow-2xl hover:scale-105 transition-all"
          >
            Get Started Now
          </Link>
        </div>
      </section>
    </div>
  );
}
