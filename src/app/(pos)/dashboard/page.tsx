import { LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Dashboard" };

// Route: /dashboard
export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Today's sales, active orders and table status at a glance."
      />
      <PagePlaceholder icon={LayoutDashboard} step={17} />
    </>
  );
}
