import { UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Menu" };

// Route: /menu
export default function MenuPage() {
  return (
    <>
      <PageHeader
        title="Menu"
        description="Menu items, prices and availability, with search and filters."
      />
      <PagePlaceholder icon={UtensilsCrossed} step={11} />
    </>
  );
}
