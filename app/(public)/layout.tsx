// Feature: Layout
// Purpose: Public-facing layout shell wrapping all customer-facing pages
// Added: 2026-05-21

import { Navbar } from "@/components/shared/Navbar";
import { ConditionalFooter } from "@/components/shared/ConditionalFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      {/* pt-0: allows hero to sit behind transparent navbar | pb-20: bottom dock offset on mobile */}
      <main className="flex min-h-screen flex-col pb-20 md:pb-0">
        {children}
      </main>
      <ConditionalFooter />
    </>
  );
}

