import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Order Details" };

// Route: /orders/[orderId]  e.g. /orders/demo-1
// `params` is a Promise in Next.js 16. With Cache Components on, we read it
// inside <Suspense>, so the rest of the page shows at once and the ID streams in.
export default function OrderDetailPage({ params }: PageProps<"/orders/[orderId]">) {
  return (
    <>
      <PageHeader
        title="Order Details"
        description={
          <Suspense fallback="Loading order…">
            {params.then(({ orderId }) => `Order ${orderId}: items, status and actions.`)}
          </Suspense>
        }
        back={{ href: "/orders", label: "Back to orders" }}
      />
      <PagePlaceholder icon={ClipboardList} step={14} />
    </>
  );
}
