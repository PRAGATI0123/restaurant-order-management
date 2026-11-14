import type { Metadata } from "next";
import { ModifiersScreen } from "@/features/menu/components/modifiers-screen";

export const metadata: Metadata = { title: "Modifiers" };

// Route: /menu/modifiers
export default function MenuModifiersPage() {
  return <ModifiersScreen />;
}
