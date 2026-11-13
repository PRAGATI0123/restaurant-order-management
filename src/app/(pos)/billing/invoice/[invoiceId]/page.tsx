import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Invoice" };

// Route: /billing/invoice/[invoiceId]  e.g. /billing/invoice/demo-inv-1
export default function InvoicePage({
  params,
}: PageProps<"/billing/invoice/[invoiceId]">) {
  return (
    <>
      <PageHeader
        title="Invoice"
        description={
          <Suspense fallback="Loading invoice…">
            {params.then(({ invoiceId }) => `Printable invoice ${invoiceId}.`)}
          </Suspense>
        }
        back={{ href: "/billing", label: "Back to billing" }}
      />
      <PagePlaceholder icon={FileText} step={16} />
    </>
  );
}
