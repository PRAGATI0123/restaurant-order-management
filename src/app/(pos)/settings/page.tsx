import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Settings" };

// Route: /settings
export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Tax rate, staff, mock API switches and demo data."
      />
      <PagePlaceholder icon={Settings} step={18} />
    </>
  );
}
