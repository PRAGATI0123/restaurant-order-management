import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SplitOrderScreen } from "@/features/orders/components/split-order-screen";

export const metadata: Metadata = { title: "Split Order" };

// Route: /orders/[orderId]/split  e.g. /orders/order-102/split
export default function SplitOrderPage({ params }: PageProps<"/orders/[orderId]/split">) {
  return (
    <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}>
      {params.then(({ orderId }) => (
        <SplitOrderScreen orderId={orderId} />
      ))}
    </Suspense>
  );
}
