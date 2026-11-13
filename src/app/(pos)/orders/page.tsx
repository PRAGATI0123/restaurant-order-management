import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Orders" };

// Route: /orders
export default function OrdersPage() {
  return (
    <main>
      <h1>Orders</h1>
      <p>All orders with status filters. (Built in Step 42)</p>
      <ul>
        <li>
          <Link href="/orders/new">New order</Link>
        </li>
        <li>
          {/* "demo-1" is a placeholder ID until real orders exist */}
          <Link href="/orders/demo-1">Open sample order demo-1</Link>
        </li>
      </ul>
    </main>
  );
}
