import { Armchair } from "lucide-react";
import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Tables" };

// Route: /tables
export default function TablesPage() {
  return (
    <>
      <PageHeader
        title="Tables"
        description="The live floor plan: Available, Occupied, Reserved and Cleaning."
      />
      <PagePlaceholder icon={Armchair} step={12} />
    </>
  );
}
