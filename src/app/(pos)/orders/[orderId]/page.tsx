import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Order Details" };

// Route: /orders/[orderId]  e.g. /orders/demo-1
// [orderId] is a dynamic segment: whatever is in the URL becomes params.orderId.
//
// In Next.js 16, `params` is a Promise (the value is only known when the request
// arrives). With Cache Components on, we read it inside <Suspense>, so the rest of
// the page can be shown immediately while the ID part loads.
export default function OrderDetailPage({ params }: PageProps<"/orders/[orderId]">) {
  return (
    <main>
      <h1>Order Details</h1>
      <Suspense fallback={<p>Loading order…</p>}>
        {params.then(({ orderId }) => (
          <>
            <p>Order ID: {orderId}</p>
            <p>
              Items, status timeline (Placed → Preparing → Ready → Served → Paid) and
              cancellations. (Built in Step 43)
            </p>
            <ul>
              <li>
                <Link href={`/orders/${orderId}/split`}>Split this order</Link>
              </li>
              <li>
                <Link href={`/billing/${orderId}`}>Go to checkout</Link>
              </li>
            </ul>
          </>
        ))}
      </Suspense>
    </main>
  );
}
