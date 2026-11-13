import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Modifiers" };

// Route: /menu/modifiers
export default function MenuModifiersPage() {
  return (
    <main>
      <h1>Variants, Add-ons and Modifiers</h1>
      <p>
        Sizes (Half / Full), add-ons (Extra cheese) and modifier groups (Spice level).
        (Built in Step 36)
      </p>
      <Link href="/menu">Back to menu</Link>
    </main>
  );
}
