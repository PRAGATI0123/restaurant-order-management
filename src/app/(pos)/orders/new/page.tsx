import type { Metadata } from "next";
import { Suspense } from "react";
import { NewOrderScreen } from "@/features/orders/components/new-order-screen";
import { PreselectTable } from "@/features/orders/components/preselect-table";

export const metadata: Metadata = { title: "New Order" };

// Route: /orders/new          → start from scratch
//        /orders/new?table=t5 → start a dine-in order at table T5 (from the Tables page)
//
// `searchParams` (the part after "?") is a Promise in Next.js 16, and with Cache
// Components it's request data, so it must be read inside <Suspense>. Only the
// tiny PreselectTable waits for it; the whole screen is ready immediately.
// The static folder "new" wins over the dynamic [orderId] folder next to it.
export default function NewOrderPage({ searchParams }: PageProps<"/orders/new">) {
  return (
    <>
      <NewOrderScreen />
      <Suspense fallback={null}>
        {searchParams.then(({ table }) => (
          // ?table can be missing, one value, or (if typed twice) a list: accept one value only.
          <PreselectTable tableId={typeof table === "string" ? table : undefined} />
        ))}
      </Suspense>
    </>
  );
}
