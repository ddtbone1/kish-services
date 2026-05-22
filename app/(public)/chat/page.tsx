import { ChatWidget } from "@/components/chat/ChatWidget";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat - Kish Auto Detailing",
  description: "Ask us anything about our auto detailing services.",
};

export default function ChatPage() {
  return (
    <main className="px-4 py-6 md:py-10 max-w-2xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold md:text-3xl">Chat with Us</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Get instant answers about our services, pricing, and availability.
        </p>
      </div>
      <ChatWidget />
    </main>
  );
}
