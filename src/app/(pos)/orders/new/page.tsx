import { ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "New Order" };

// Route: /orders/new
// The static folder "new" wins over the dynamic [orderId] folder next to it,
// so /orders/new opens this page, not an order with the ID "new".
export default function NewOrderPage() {
  return (
    <>
      <PageHeader
        title="New Order"
        description="Pick dine-in, takeaway or delivery, add items, and send it to the kitchen."
        back={{ href: "/orders", label: "Back to orders" }}
      />
      <PagePlaceholder icon={ShoppingCart} step={13} />
    </>
  );
}
