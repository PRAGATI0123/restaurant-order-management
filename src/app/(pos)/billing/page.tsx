import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Billing" };

// Route: /billing
export default function BillingPage() {
  return (
    <main>
      <h1>Billing</h1>
      <p>Orders waiting for payment. Tap one to open checkout. (Built in Step 47)</p>
      <ul>
        <li>
          <Link href="/billing/demo-1">Checkout sample order demo-1</Link>
        </li>
        <li>
          <Link href="/billing/invoice/demo-inv-1">View sample invoice demo-inv-1</Link>
        </li>
        <li>
          <Link href="/billing/transactions">Transaction history</Link>
        </li>
      </ul>
    </main>
  );
}
