import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderDetailScreen } from "@/features/orders/components/order-detail-screen";

export const metadata: Metadata = { title: "Order Details" };

// Route: /orders/[orderId]  e.g. /orders/order-102
// `params` is a Promise in Next.js 16; with Cache Components we read it inside
// <Suspense>. Everything on this page depends on which order it is, so the
// whole screen waits for the id (a skeleton shows meanwhile).
export default function OrderDetailPage({ params }: PageProps<"/orders/[orderId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}>
      {params.then(({ orderId }) => (
        <OrderDetailScreen orderId={orderId} />
      ))}
    </Suspense>
  );
}
