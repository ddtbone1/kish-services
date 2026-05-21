import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kish Auto Detailing Services",
  description:
    "Professional auto detailing services. Book your appointment online.",
};

export default function HomePage() {
  return (
    <main className="flex flex-col items-center px-4 py-8 md:py-16">
      <div className="w-full max-w-4xl space-y-8">
        <section className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            Kish Auto Detailing
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Premium auto detailing services. Book your appointment online and
            we&apos;ll take care of the rest.
          </p>
        </section>

        {/* Services list will be rendered here */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold md:text-2xl">Our Services</h2>
          <p className="text-muted-foreground">Loading services...</p>
        </section>
      </div>
    </main>
  );
}
