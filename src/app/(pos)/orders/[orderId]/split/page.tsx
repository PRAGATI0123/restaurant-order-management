import { ArrowRightLeft } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Split Order" };

// Route: /orders/[orderId]/split  e.g. /orders/demo-1/split
export default function SplitOrderPage({ params }: PageProps<"/orders/[orderId]/split">) {
  return (
    <>
      <PageHeader
        title="Split Order"
        description={
          <Suspense fallback="Loading order…">
            {params.then(
              ({ orderId }) => `Move items from order ${orderId} into a new order.`,
            )}
          </Suspense>
        }
        back={{ href: "/orders", label: "Back to orders" }}
      />
      <PagePlaceholder icon={ArrowRightLeft} step={14} />
    </>
  );
}
