import { FaqList } from "@/components/dashboard/FaqList";
import { getAllFaqs } from "@/lib/services/faq.service";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ Management - Kish Auto Detailing",
};

export default async function FaqManagementPage() {
  const { data: faqs } = await getAllFaqs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">FAQ Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the questions and answers shown to customers in the chat.
        </p>
      </div>
      <FaqList faqs={faqs ?? []} />
    </div>
  );
}
