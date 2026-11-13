import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Invoice" };

// Route: /billing/invoice/[invoiceId]  e.g. /billing/invoice/demo-inv-1
export default function InvoicePage({ params }: PageProps<"/billing/invoice/[invoiceId]">) {
  return (
    <main>
      <h1>Invoice</h1>
      <Suspense fallback={<p>Loading invoice…</p>}>
        {params.then(({ invoiceId }) => (
          <>
            <p>Invoice number: {invoiceId}</p>
            <p>A print-friendly invoice with a Print button. (Built in Step 49)</p>
            <Link href="/billing">Back to billing</Link>
          </>
        ))}
      </Suspense>
    </main>
  );
}
