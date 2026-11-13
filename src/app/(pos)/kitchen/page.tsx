import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kitchen" };

// Route: /kitchen
export default function KitchenPage() {
  return (
    <main>
      <h1>Kitchen Display</h1>
      <p>
        Incoming orders, preparation status, elapsed time, and late orders highlighted.
        (Built in Steps 45–46)
      </p>
    </main>
  );
}
