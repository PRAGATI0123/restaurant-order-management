import type { Metadata } from "next";
import { MenuScreen } from "@/features/menu/components/menu-screen";

export const metadata: Metadata = { title: "Menu" };

// Route: /menu
// The page stays a small Server Component. All the interactive parts (search,
// filters, switches, forms) live in MenuScreen, a Client Component.
export default function MenuPage() {
  return <MenuScreen />;
}
