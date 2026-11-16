import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckoutScreen } from "@/features/billing/components/checkout-screen";

export const metadata: Metadata = { title: "Checkout" };

// Route: /billing/[orderId]  e.g. /billing/order-102
// The static folders "transactions" and "invoice" next to this one take priority,
// so /billing/transactions does NOT land here.
// `params` is a Promise in Next.js 16: read inside <Suspense> (Cache Components).
export default function CheckoutPage({ params }: PageProps<"/billing/[orderId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}>
      {params.then(({ orderId }) => (
        <CheckoutScreen orderId={orderId} />
      ))}
    </Suspense>
  );
}
