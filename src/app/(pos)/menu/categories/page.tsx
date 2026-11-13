import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Menu Categories" };

// Route: /menu/categories
export default function MenuCategoriesPage() {
  return (
    <main>
      <h1>Menu Categories</h1>
      <p>Create, rename and reorder categories like Starters, Mains, Drinks. (Step 35)</p>
      <Link href="/menu">Back to menu</Link>
    </main>
  );
}
