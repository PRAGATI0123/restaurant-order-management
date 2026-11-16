import type { Metadata } from "next";
import { ReportsScreen } from "@/features/reports/components/reports-screen";

export const metadata: Metadata = { title: "Reports" };

// Route: /reports
export default function ReportsPage() {
  return <ReportsScreen />;
}
