import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat - Kish Auto Detailing",
  description: "Ask us anything about our auto detailing services.",
};

export default function ChatPage() {
  return (
    <main className="flex flex-col items-center px-4 py-8 md:py-16">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold md:text-3xl">Chat with Us</h1>
        <p className="text-muted-foreground">
          Chatbot widget will be implemented here.
        </p>
      </div>
    </main>
  );
}
