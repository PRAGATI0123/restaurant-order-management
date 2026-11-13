import { Move } from "lucide-react";
import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Floor Plan Editor" };

// Route: /tables/editor
export default function FloorPlanEditorPage() {
  return (
    <>
      <PageHeader
        title="Floor Plan Editor"
        description="Manager only. Add tables and drag them into place."
        back={{ href: "/tables", label: "Back to tables" }}
      />
      <PagePlaceholder icon={Move} step={12} />
    </>
  );
}
