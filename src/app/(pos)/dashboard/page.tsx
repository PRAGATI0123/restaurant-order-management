import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

// Route: /dashboard
export default function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      <p>
        Today&apos;s sales, active orders, occupied tables, order status summary and sales
        charts. (Built in Steps 51–52)
      </p>
    </main>
  );
}
