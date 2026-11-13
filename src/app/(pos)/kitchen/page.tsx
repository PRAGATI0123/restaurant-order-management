import { ChefHat } from "lucide-react";
import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Kitchen" };

// Route: /kitchen
export default function KitchenPage() {
  return (
    <>
      <PageHeader
        title="Kitchen Display"
        description="Incoming tickets, preparation status and timers. Late orders are highlighted."
      />
      <PagePlaceholder icon={ChefHat} step={15} />
    </>
  );
}
