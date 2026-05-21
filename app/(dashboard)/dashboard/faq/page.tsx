import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ Management - Kish Auto Detailing",
};

export default function FaqManagementPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">FAQ Management</h1>
      <p className="text-muted-foreground">
        FAQ CRUD interface will be rendered here.
      </p>
    </div>
  );
}
