import type { Metadata } from "next";
import { SettingsScreen } from "@/features/settings/components/settings-screen";

export const metadata: Metadata = { title: "Settings" };

// Route: /settings  (managers only: the AuthGate in the layout checks)
export default function SettingsPage() {
  return <SettingsScreen />;
}
