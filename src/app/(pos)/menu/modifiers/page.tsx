import { SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Modifiers" };

// Route: /menu/modifiers
export default function MenuModifiersPage() {
  return (
    <>
      <PageHeader
        title="Variants, Add-ons and Modifiers"
        description="Sizes (Half / Full), add-ons (Extra cheese) and choices (Spice level)."
        back={{ href: "/menu", label: "Back to menu" }}
      />
      <PagePlaceholder icon={SlidersHorizontal} step={11} />
    </>
  );
}
