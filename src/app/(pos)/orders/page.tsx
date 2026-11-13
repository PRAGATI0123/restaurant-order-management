import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Orders" };

// Route: /orders
export default function OrdersPage() {
  return (
    <>
      <PageHeader
        title="Orders"
        description="Every dine-in, takeaway and delivery order, with status filters."
      />
      <PagePlaceholder icon={ClipboardList} step={14} />
    </>
  );
}
