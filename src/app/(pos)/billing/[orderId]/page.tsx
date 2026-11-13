import { Wallet } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Checkout" };

// Route: /billing/[orderId]  e.g. /billing/demo-1
// The static folders "transactions" and "invoice" next to this one take priority,
// so /billing/transactions does NOT land here.
export default function CheckoutPage({ params }: PageProps<"/billing/[orderId]">) {
  return (
    <>
      <PageHeader
        title="Checkout"
        description={
          <Suspense fallback="Loading bill…">
            {params.then(
              ({ orderId }) => `Bill for order ${orderId}: discounts, tax and payment.`,
            )}
          </Suspense>
        }
        back={{ href: "/billing", label: "Back to billing" }}
      />
      <PagePlaceholder icon={Wallet} step={16} />
    </>
  );
}
