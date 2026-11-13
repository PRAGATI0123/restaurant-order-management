import { Layers } from "lucide-react";
import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Menu Categories" };

// Route: /menu/categories
export default function MenuCategoriesPage() {
  return (
    <>
      <PageHeader
        title="Menu Categories"
        description="Group the menu into sections like Starters, Mains and Drinks."
        back={{ href: "/menu", label: "Back to menu" }}
      />
      <PagePlaceholder icon={Layers} step={11} />
    </>
  );
}
