import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Split Order" };

// Route: /orders/[orderId]/split  e.g. /orders/demo-1/split
export default function SplitOrderPage({ params }: PageProps<"/orders/[orderId]/split">) {
  return (
    <main>
      <h1>Split Order</h1>
      <Suspense fallback={<p>Loading order…</p>}>
        {params.then(({ orderId }) => (
          <>
            <p>Splitting order: {orderId}</p>
            <p>Move items from this order into a new order. (Built in Step 44)</p>
            <Link href={`/orders/${orderId}`}>Back to order</Link>
          </>
        ))}
      </Suspense>
    </main>
  );
}
