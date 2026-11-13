import { ChartColumn } from "lucide-react";
import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Reports" };

// Route: /reports
export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Sales and orders for any date range." />
      <PagePlaceholder icon={ChartColumn} step={17} />
    </>
  );
}
