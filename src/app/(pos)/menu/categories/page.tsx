import type { Metadata } from "next";
import { CategoriesScreen } from "@/features/menu/components/categories-screen";

export const metadata: Metadata = { title: "Menu Categories" };

// Route: /menu/categories
export default function MenuCategoriesPage() {
  return <CategoriesScreen />;
}
