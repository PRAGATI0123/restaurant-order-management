import type { Metadata } from "next";
import { KitchenScreen } from "@/features/kitchen/components/kitchen-screen";

export const metadata: Metadata = { title: "Kitchen" };

// Route: /kitchen
export default function KitchenPage() {
  return <KitchenScreen />;
}
