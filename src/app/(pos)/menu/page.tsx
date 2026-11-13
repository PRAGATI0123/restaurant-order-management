import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Menu" };

// Route: /menu
export default function MenuPage() {
  return (
    <main>
      <h1>Menu</h1>
      <p>
        Menu items with search, filters and an availability switch. Add and edit items.
        (Built in Steps 34–35)
      </p>
      <ul>
        <li>
          <Link href="/menu/categories">Categories</Link>
        </li>
        <li>
          <Link href="/menu/modifiers">Variants, add-ons and modifiers</Link>
        </li>
      </ul>
    </main>
  );
}
