import type { Metadata } from "next";
import { BillingScreen } from "@/features/billing/components/billing-screen";

export const metadata: Metadata = { title: "Billing" };

// Route: /billing
export default function BillingPage() {
  return <BillingScreen />;
}
