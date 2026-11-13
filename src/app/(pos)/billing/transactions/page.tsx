import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Transactions" };

// Route: /billing/transactions
export default function TransactionsPage() {
  return (
    <main>
      <h1>Transaction History</h1>
      <p>Every completed payment, with method, amount and time. (Built in Step 50)</p>
      <Link href="/billing">Back to billing</Link>
    </main>
  );
}
