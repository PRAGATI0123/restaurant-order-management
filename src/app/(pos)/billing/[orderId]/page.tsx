import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Checkout" };

// Route: /billing/[orderId]  e.g. /billing/demo-1
// The static folders "transactions" and "invoice" next to this one take priority,
// so /billing/transactions does NOT land here.
export default function CheckoutPage({ params }: PageProps<"/billing/[orderId]">) {
  return (
    <main>
      <h1>Checkout</h1>
      <Suspense fallback={<p>Loading bill…</p>}>
        {params.then(({ orderId }) => (
          <>
            <p>Bill for order: {orderId}</p>
            <p>
              Subtotal, discounts, taxes and total. Pay by cash, card or UPI, or split the
              payment. (Built in Steps 47–48)
            </p>
            <Link href="/billing">Back to billing</Link>
          </>
        ))}
      </Suspense>
    </main>
  );
}
