import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Billing" };

// Route: /billing
export default function BillingPage() {
  return (
    <>
      <PageHeader
        title="Billing"
        description="Orders waiting for payment. Tap one to open checkout."
      />
      <PagePlaceholder icon={Receipt} step={16} />
    </>
  );
}
