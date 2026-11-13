import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Floor Plan Editor" };

// Route: /tables/editor
export default function FloorPlanEditorPage() {
  return (
    <main>
      <h1>Floor Plan Editor</h1>
      <p>Manager only. Add tables and drag them into place. (Built in Step 38)</p>
      <Link href="/tables">Back to tables</Link>
    </main>
  );
}
