import { ListOrdered } from "lucide-react";
import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Transactions" };

// Route: /billing/transactions
export default function TransactionsPage() {
  return (
    <>
      <PageHeader
        title="Transaction History"
        description="Every completed payment, with method, amount and time."
        back={{ href: "/billing", label: "Back to billing" }}
      />
      <PagePlaceholder icon={ListOrdered} step={16} />
    </>
  );
}
