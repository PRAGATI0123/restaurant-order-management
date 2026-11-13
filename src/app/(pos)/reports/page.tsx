import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reports" };

// Route: /reports
export default function ReportsPage() {
  return (
    <main>
      <h1>Reports</h1>
      <p>Sales and order reports filtered by date range. (Built in Step 53)</p>
    </main>
  );
}
