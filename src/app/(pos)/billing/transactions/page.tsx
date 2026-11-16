import type { Metadata } from "next";
import { TransactionsScreen } from "@/features/billing/components/transactions-screen";

export const metadata: Metadata = { title: "Transactions" };

// Route: /billing/transactions
export default function TransactionsPage() {
  return <TransactionsScreen />;
}
