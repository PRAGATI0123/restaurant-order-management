import type { Metadata } from "next";

export const metadata: Metadata = { title: "New Order" };

// Route: /orders/new
// This static folder "new" wins over the dynamic [orderId] folder next to it,
// so /orders/new opens this page, not an order with the ID "new".
export default function NewOrderPage() {
  return (
    <main>
      <h1>New Order</h1>
      <p>
        Choose dine-in, takeaway or delivery, pick a table, add items with modifiers and
        notes. (Built in Steps 40–41)
      </p>
    </main>
  );
}
