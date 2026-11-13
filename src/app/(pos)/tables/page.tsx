import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Tables" };

// Route: /tables
export default function TablesPage() {
  return (
    <main>
      <h1>Tables</h1>
      <p>
        Live floor plan. Tables show Available, Occupied, Reserved or Cleaning. Transfer
        orders and merge tables from here. (Built in Steps 37 and 39)
      </p>
      <Link href="/tables/editor">Edit floor plan</Link>
    </main>
  );
}
