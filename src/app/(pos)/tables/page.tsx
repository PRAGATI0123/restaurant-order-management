import type { Metadata } from "next";
import { TablesScreen } from "@/features/tables/components/tables-screen";

export const metadata: Metadata = { title: "Tables" };

// Route: /tables
export default function TablesPage() {
  return <TablesScreen />;
}
