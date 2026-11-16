import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceScreen } from "@/features/billing/components/invoice-screen";

export const metadata: Metadata = { title: "Invoice" };

// Route: /billing/invoice/[invoiceId]  e.g. /billing/invoice/inv-1003-1
// `params` is a Promise in Next.js 16: read inside <Suspense> (Cache Components).
export default function InvoicePage({
  params,
}: PageProps<"/billing/invoice/[invoiceId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[70vh] w-full" />}>
      {params.then(({ invoiceId }) => (
        <InvoiceScreen invoiceId={invoiceId} />
      ))}
    </Suspense>
  );
}
